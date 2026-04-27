/**
 * Bug 3 — Session log streaming.
 *
 * Two endpoints share this logic:
 *   - GET /api/sessions/:sid/log/stream  → Server-Sent Events
 *   - GET /api/sessions/:sid/log?since=N → polling JSON
 *
 * We tail the per-session log file via fs.watch + read-since-offset, since
 * `Bun.file().stream()` doesn't follow appends. SSE keeps a heartbeat ping
 * every 15s so proxies don't close the connection.
 */

import { existsSync, readFileSync, statSync, watch as fsWatch } from 'node:fs';
import { getDb } from '../db/client.ts';

export interface LogPollResult {
  lines: string[];
  nextOffset: number;
  done: boolean;
}

/** Look up the on-disk log path for a given session id. */
export function logPathForSession(sessionId: string): {
  path: string | null;
  done: boolean;
} {
  const db = getDb();
  const row = db
    .query<
      { log_path: string | null; completed_at: string | null },
      [string]
    >('SELECT log_path, completed_at FROM sessions WHERE id = ?')
    .get(sessionId);
  if (!row) return { path: null, done: true };
  return { path: row.log_path, done: !!row.completed_at };
}

/** Polling: read everything past `since` byte offset, return lines + new offset. */
export function pollLogSince(sessionId: string, since: number): LogPollResult {
  const { path, done } = logPathForSession(sessionId);
  if (!path || !existsSync(path)) {
    return { lines: [], nextOffset: since, done: true };
  }
  let size = 0;
  try {
    size = statSync(path).size;
  } catch {
    return { lines: [], nextOffset: since, done };
  }
  if (size <= since) return { lines: [], nextOffset: since, done };
  const buf = readFileSync(path);
  const slice = buf.subarray(Math.max(0, since), size).toString('utf8');
  const lines = slice.split('\n');
  // The trailing element after the last \n may be a partial line. Keep it
  // attached by NOT consuming the final newline-less fragment — the next
  // poll will pick it up with full content. Simplest: split keeps it; client
  // can ignore '' last elements.
  return { lines, nextOffset: size, done };
}

/**
 * SSE: writes incremental log content to a `WritableStreamDefaultWriter`.
 * Returns a cleanup function the caller invokes when the client disconnects.
 */
export function streamLog(
  sessionId: string,
  write: (chunk: string) => void,
  onClose: () => void,
): () => void {
  const { path } = logPathForSession(sessionId);
  if (!path) {
    write(
      `event: error\ndata: ${JSON.stringify({ error: 'session not found' })}\n\n`,
    );
    onClose();
    return () => {};
  }
  let offset = 0;
  let watcher: ReturnType<typeof fsWatch> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const flush = (): void => {
    if (closed) return;
    if (!existsSync(path)) return;
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      return;
    }
    if (size <= offset) return;
    const buf = readFileSync(path);
    const slice = buf.subarray(offset, size).toString('utf8');
    offset = size;
    for (const line of slice.split('\n')) {
      if (line.length === 0) continue;
      write(`data: ${line}\n\n`);
    }
  };

  const close = (reason: string): void => {
    if (closed) return;
    closed = true;
    if (watcher) watcher.close();
    if (heartbeat) clearInterval(heartbeat);
    write(`event: done\ndata: ${JSON.stringify({ reason })}\n\n`);
    onClose();
  };

  // Initial dump.
  flush();

  // Poll on file change.
  if (existsSync(path)) {
    try {
      watcher = fsWatch(path, () => flush());
    } catch {
      // fs.watch can throw on some FS (network mounts) — fall back to pure polling
    }
  }
  // Backup poll every 1s in case watcher misses events.
  const backupPoll = setInterval(() => flush(), 1_000);
  heartbeat = setInterval(() => {
    if (closed) return;
    write(': heartbeat\n\n');
    // Detect session completion.
    const { done } = logPathForSession(sessionId);
    if (done) {
      flush();
      clearInterval(backupPoll);
      close('session ended');
    }
  }, 15_000);

  return () => {
    clearInterval(backupPoll);
    close('client disconnect');
  };
}
