/**
 * Lifecycle helpers — clean shutdown + startup orphan reconciliation.
 *
 * Bug 2 (2026-04-27): when backend gets Ctrl+C in tmux, zsh doesn't propagate
 * to claude children (we spawn detached) — but the backend itself dies. On
 * restart we need to reconcile sessions whose row says `in-progress` against
 * the actual `ps` table, and during shutdown we mark active sessions as
 * `awaiting-cheyu` so cheyu sees them in the daily report.
 */

import { spawnSync } from 'node:child_process';
import { getDb } from '../db/client.ts';
import { child as childLogger } from '../logger.ts';
import { listActive } from '../spawner/concurrency.ts';
import { getTask } from '../tasks/manager.ts';
import { saveTask } from '../tasks/manager.ts';

const log = childLogger({ module: 'lifecycle/shutdown' });

/**
 * Called from server SIGINT/SIGTERM handler. Marks every in-flight session
 * with status `awaiting-cheyu` so cheyu's daily report flags them, and logs
 * the surviving PIDs to stderr so cheyu can re-attach.
 */
export function markActiveSessionsForReview(reason: string): void {
  const sessions = listActive();
  if (sessions.length === 0) {
    log.info('no active sessions at shutdown');
    return;
  }
  log.warn(
    { count: sessions.length, reason, pids: sessions.map((s) => s.pid) },
    'shutdown with active sessions — marking awaiting-cheyu',
  );
  for (const s of sessions) {
    const note = `backend shutdown during spawn (${reason}) — child pid ${s.pid ?? '?'} may still be running, check 'ps -p ${s.pid ?? '?'}'`;
    const task = getTask(s.taskId);
    if (!task) continue;
    task.status = 'awaiting-cheyu';
    task.notes = [task.notes, note].filter(Boolean).join('\n');
    saveTask(task, note);
    process.stderr.write(
      `[harvest] active session ${s.sessionId} pid=${s.pid} taskId=${s.taskId} — ${note}\n`,
    );
  }
}

/**
 * On startup, scan sessions that the DB thinks are still running. If the
 * recorded pid is no longer alive, mark the task `failed` with an orphan
 * note. If pid IS alive, leave the row alone — the in-memory active map will
 * NOT have it (because we just booted) so cheyu's UI won't see live updates,
 * but the historical record stays consistent.
 */
export function reconcileOrphanSessions(): void {
  const db = getDb();
  const rows = db
    .query<
      {
        id: string;
        task_id: string;
        pid: number | null;
        spawned_at: string;
      },
      []
    >(
      `SELECT s.id, s.task_id, s.pid, s.spawned_at
       FROM sessions s
       WHERE s.completed_at IS NULL`,
    )
    .all();

  if (rows.length === 0) {
    log.info('no in-flight sessions on startup');
    return;
  }

  let orphaned = 0;
  let stillAlive = 0;
  for (const row of rows) {
    const alive = row.pid !== null && isPidAlive(row.pid);
    if (alive) {
      stillAlive++;
      log.warn(
        { sessionId: row.id, pid: row.pid, taskId: row.task_id },
        'session still alive after backend restart — re-attached state, no live updates available',
      );
      continue;
    }
    orphaned++;
    const note = `backend restart found orphaned session pid=${row.pid ?? '?'}`;
    db.run(
      `UPDATE sessions SET completed_at = ?, exit_code = -1, killed_reason = ? WHERE id = ?`,
      [new Date().toISOString(), note, row.id],
    );
    const task = getTask(row.task_id);
    if (task && (task.status === 'spawning' || task.status === 'in-progress')) {
      task.status = 'failed';
      task.notes = [task.notes, note].filter(Boolean).join('\n');
      saveTask(task, note);
    }
  }
  log.info(
    { orphaned, stillAlive, total: rows.length },
    'orphan reconciliation complete',
  );
}

function isPidAlive(pid: number): boolean {
  try {
    // Signal 0 doesn't actually send anything — just checks if the process
    // exists and we have permission to signal it.
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // EPERM means the process exists but we can't signal it (e.g. owned by
    // another user) — treat as alive.
    if (code === 'EPERM') return true;
    return false;
  }
}

/** Quick `ps -p` based double-check used by health monitor. */
export function pidExistsViaPs(pid: number): boolean {
  try {
    const r = spawnSync('ps', ['-p', String(pid)]);
    return r.status === 0;
  } catch {
    return false;
  }
}
