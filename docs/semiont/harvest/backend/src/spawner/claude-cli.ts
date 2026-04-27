/**
 * Claude CLI spawner.
 *
 * Spawns the `claude` CLI as a detached child process with the prompt piped
 * on stdin. Streams stdout/stderr to a per-session log file under
 * `.harvest/tasks/{id}/sessions/{session-id}.log` and to pino.
 *
 * Hard timeout per session: config.sessionTimeoutMs (default 90 min).
 *
 * Bug 1 fix (2026-04-27): commit attribution uses `git log --since=<spawn_iso>
 * --author=<git user.name>` instead of HEAD-diff so external `git pull` during
 * the spawn window doesn't get falsely attributed to the spawn.
 *
 * Bug 2 fix (2026-04-27): child is `detached: true` so it's its own process
 * group leader — SIGINT to the backend (via tmux/zsh) does NOT cascade to
 * claude. The backend's shutdown handler explicitly marks active sessions as
 * `awaiting-cheyu` and lets the child keep running.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, createWriteStream, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { getDb } from '../db/client.ts';
import { child as childLogger } from '../logger.ts';
import { saveTask } from '../tasks/manager.ts';
import type { Task, TaskSession } from '../tasks/types.ts';
import { buildSpawnPrompt } from './prompt-builder.ts';
import {
  register as registerActive,
  setPhase as setActivePhase,
  unregister as unregisterActive,
} from './concurrency.ts';

const log = childLogger({ module: 'spawner/claude-cli' });

export interface SpawnResult {
  sessionId: string;
  exitCode: number;
  durationMs: number;
  logPath: string;
  promptPath: string;
  /** Commits this session produced (best-effort, parsed via session-scoped git log). */
  commits: string[];
  /** True when the hard timeout fired and we killed the process. */
  timedOut: boolean;
}

export interface SpawnOptions {
  /** Skip actually running claude — only build the prompt and persist it. */
  dryRun?: boolean;
}

/**
 * Spawn a `claude` process for a given Task. Returns once the child exits or
 * the hard timeout fires.
 */
export async function spawnClaudeForTask(
  task: Task,
  options: SpawnOptions = {},
): Promise<SpawnResult> {
  const sessionId = randomUUID();
  const sessionsDir = join(task.folder_path, 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const logPath = join(sessionsDir, `${sessionId}.log`);
  const promptPath = join(sessionsDir, `${sessionId}.prompt.md`);

  const prompt = buildSpawnPrompt(task);
  writeFileSync(promptPath, prompt, 'utf8');

  const spawnedAt = new Date();
  const spawnStartIso = spawnedAt.toISOString();
  const sessionRecord: TaskSession = {
    id: sessionId,
    spawned_at: spawnStartIso,
    log_path: logPath,
    prompt_path: promptPath,
  };
  task.sessions.push(sessionRecord);
  task.attempts += 1;
  task.status = 'spawning';
  saveTask(task, `spawn attempt ${task.attempts} session=${sessionId}`);

  registerActive({
    sessionId,
    taskId: task.id,
    taskTitle: task.title,
    taskType: task.type,
    bootProfile: task.boot_profile,
    pid: undefined,
    spawnedAt: spawnStartIso,
    phase: 'spawning',
  });

  const db = getDb();
  db.run(
    `INSERT INTO sessions (id, task_id, pid, spawned_at, spawn_start_iso, log_path, prompt_path)
     VALUES (?, ?, NULL, ?, ?, ?, ?)`,
    [sessionId, task.id, spawnStartIso, spawnStartIso, logPath, promptPath],
  );

  if (options.dryRun) {
    log.info(
      { taskId: task.id, sessionId, logPath },
      'dryRun=true — skipping claude exec',
    );
    sessionRecord.completed_at = new Date().toISOString();
    sessionRecord.exit_code = 0;
    task.status = 'pending';
    saveTask(task, 'dry-run complete (no claude exec)');
    unregisterActive(sessionId);
    return {
      sessionId,
      exitCode: 0,
      durationMs: 0,
      logPath,
      promptPath,
      commits: [],
      timedOut: false,
    };
  }

  task.status = 'in-progress';
  saveTask(task, `claude session ${sessionId} starting`);

  const logStream = createWriteStream(logPath, { flags: 'a' });
  logStream.write(
    `# session ${sessionId}\n# task ${task.id}\n# started ${spawnStartIso}\n# claude bin: ${config.claudeBin}\n\n`,
  );

  const cliArgs = ['--print', '--dangerously-skip-permissions'];
  if (process.env.ANTHROPIC_API_KEY) cliArgs.unshift('--bare');
  // Bug 2 fix: detached:true makes the child its own process-group leader.
  // SIGINT to the backend (Ctrl+C in tmux) won't cascade through the group.
  // We still want stdin piped (prompt) and stdout/stderr piped (capture log),
  // so we cannot fully `unref()` — but the detached flag is what matters for
  // signal isolation on POSIX.
  const child = spawn(config.claudeBin, cliArgs, {
    cwd: config.repoRoot,
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: true,
    env: {
      ...process.env,
      HARVEST_TASK_ID: task.id,
      HARVEST_SESSION_ID: sessionId,
      HARVEST_SESSION_SHORT: sessionId.slice(0, 8),
    },
  });

  db.run('UPDATE sessions SET pid = ? WHERE id = ?', [
    child.pid ?? null,
    sessionId,
  ]);
  setActivePhase(sessionId, 'in-progress', child.pid);
  log.info(
    { taskId: task.id, sessionId, pid: child.pid, detached: true },
    'spawned claude (detached)',
  );

  child.stdin.write(prompt);
  child.stdin.end();
  child.stdout.on('data', (chunk: Buffer) => logStream.write(chunk));
  child.stderr.on('data', (chunk: Buffer) => logStream.write(chunk));

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    log.warn(
      { taskId: task.id, sessionId, timeoutMs: config.sessionTimeoutMs },
      'hard timeout — killing claude',
    );
    try {
      if (child.pid !== undefined) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
    setTimeout(() => {
      try {
        if (child.pid !== undefined) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, 5_000);
  }, config.sessionTimeoutMs);

  const exitCode: number = await new Promise((resolve) => {
    child.on('exit', (code) => resolve(code ?? -1));
    child.on('error', (err) => {
      logStream.write(`\n[spawner] error: ${String(err)}\n`);
      resolve(-1);
    });
  });
  clearTimeout(timeout);
  logStream.end();

  const completedAt = new Date();
  sessionRecord.completed_at = completedAt.toISOString();
  sessionRecord.exit_code = exitCode;
  // Bug 1 fix: session-scoped commit query.
  const commits = await commitsInWindow(spawnStartIso, completedAt);
  if (commits.length) sessionRecord.commits = commits;

  db.run('UPDATE sessions SET completed_at = ?, exit_code = ? WHERE id = ?', [
    sessionRecord.completed_at,
    exitCode,
    sessionId,
  ]);
  if (commits.length) {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO session_commits (session_id, commit_hash) VALUES (?, ?)',
    );
    for (const c of commits) stmt.run(sessionId, c);
  }

  task.status = inferStatusFromExit(exitCode, timedOut);
  saveTask(
    task,
    `claude session ${sessionId} exited code=${exitCode} timedOut=${timedOut}`,
  );

  unregisterActive(sessionId);

  log.info(
    { taskId: task.id, sessionId, exitCode, timedOut, commits: commits.length },
    'claude session ended',
  );

  return {
    sessionId,
    exitCode,
    durationMs: completedAt.getTime() - spawnedAt.getTime(),
    logPath,
    promptPath,
    commits,
    timedOut,
  };
}

function inferStatusFromExit(
  exitCode: number,
  timedOut: boolean,
): Task['status'] {
  if (timedOut) return 'failed';
  if (exitCode === 0) return 'done';
  return 'failed';
}

/**
 * Find commits authored by the local git user inside the spawn window.
 *
 * Pragmatic v1 caveat: this still attributes ALL local-author commits in the
 * window to this session, including unrelated manual commits cheyu typed in
 * another terminal during the spawn. A v2 follow-up should require the spawned
 * claude to embed `[sid:<short>]` in commit messages and grep for that marker
 * (HARVEST_SESSION_SHORT is already passed via env for that future change).
 */
async function commitsInWindow(
  fromIso: string,
  toDate: Date,
): Promise<string[]> {
  try {
    const author = (
      await runGit(['config', 'user.name']).catch(() => '')
    ).trim();
    const args = [
      'log',
      '--pretty=%H',
      `--since=${fromIso}`,
      `--until=${toDate.toISOString()}`,
    ];
    if (author) args.push(`--author=${author}`);
    const out = await runGit(args);
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd: config.repoRoot });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('exit', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`git ${args.join(' ')} exit ${code}: ${stderr}`));
    });
  });
}
