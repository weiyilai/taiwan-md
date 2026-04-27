/**
 * Phase 4 — Auto-spawn loop.
 *
 * Every config.autoSpawnPollSec (default 300s = 5 min):
 *   1. Skip if scheduler paused.
 *   2. Pull pending tasks ordered by priority asc, created_at asc.
 *   3. For each, if it satisfies min_priority_for_auto_spawn AND canSpawn(),
 *      fire spawnClaudeForTask. Otherwise stop.
 *   4. Log every decision.
 *
 * Without this loop the engine is half-built — cheyu would still need to
 * click ▶️ for every P0/P1.
 */

import { config } from '../config.ts';
import { child as childLogger } from '../logger.ts';
import { isPaused } from './cron.ts';
import { canSpawn, activeForTask } from '../spawner/concurrency.ts';
import { listTasks } from '../tasks/manager.ts';
import { spawnClaudeForTask } from '../spawner/claude-cli.ts';
import { logger } from '../logger.ts';
import type { TaskPriority } from '../tasks/types.ts';

const log = childLogger({ module: 'scheduler/auto-spawn' });

let timer: ReturnType<typeof setInterval> | null = null;

const PRIORITY_RANK: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export function startAutoSpawn(): void {
  if (timer) return;
  if (config.disableAutoSpawn) {
    log.info('auto-spawn disabled via env');
    return;
  }
  const intervalMs = config.autoSpawnPollSec * 1000;
  timer = setInterval(() => {
    tick().catch((err) =>
      log.error({ err: String(err) }, 'auto-spawn tick failed'),
    );
  }, intervalMs);
  log.info(
    { intervalMs, minPriority: config.autoSpawnMinPriority },
    'auto-spawn started',
  );
}

export function stopAutoSpawn(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

async function tick(): Promise<void> {
  if (isPaused()) {
    log.debug('auto-spawn skipped — scheduler paused');
    return;
  }
  const minRank = PRIORITY_RANK[config.autoSpawnMinPriority] ?? 1;
  const candidates = listTasks({ status: 'pending', limit: 20 });
  if (candidates.length === 0) {
    log.debug('auto-spawn: no pending tasks');
    return;
  }
  for (const task of candidates) {
    if (!canSpawn()) {
      log.info(
        { remaining: candidates.length },
        'auto-spawn: max concurrent reached, stopping',
      );
      return;
    }
    const rank = PRIORITY_RANK[task.priority] ?? 99;
    if (rank > minRank) {
      log.debug(
        {
          taskId: task.id,
          priority: task.priority,
          minPriority: config.autoSpawnMinPriority,
        },
        'auto-spawn: priority too low, skipping',
      );
      continue;
    }
    if (activeForTask(task.id)) {
      log.debug(
        { taskId: task.id },
        'auto-spawn: task already active, skipping',
      );
      continue;
    }
    if (task.attempts >= task.max_attempts) {
      log.debug(
        { taskId: task.id, attempts: task.attempts },
        'auto-spawn: max attempts hit, skipping',
      );
      continue;
    }
    log.info(
      {
        taskId: task.id,
        type: task.type,
        priority: task.priority,
        attempts: task.attempts,
      },
      'auto-spawn: dispatching',
    );
    spawnClaudeForTask(task, { dryRun: false }).catch((err) => {
      logger.error(
        { err: String(err), taskId: task.id },
        'auto-spawn: background spawn failed',
      );
    });
  }
}

export function autoSpawnConfigSummary(): {
  enabled: boolean;
  intervalSec: number;
  minPriority: TaskPriority | string;
} {
  return {
    enabled: !config.disableAutoSpawn,
    intervalSec: config.autoSpawnPollSec,
    minPriority: config.autoSpawnMinPriority,
  };
}
