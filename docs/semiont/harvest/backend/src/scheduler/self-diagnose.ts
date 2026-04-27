/**
 * Phase 4 — Self-diagnose cron jobs.
 *
 * 4b. Organ score drift (every 6h):
 *   - Walk knowledge/**.md frontmatter for `lastVerified`.
 *   - Articles with lastVerified > 6 months ago accrue drift score.
 *   - Score > threshold → spawn article-evolve task (deduped).
 *
 * 4c. 3-day no-spore detector (daily 18:00):
 *   - Check git log for `🧬 [semiont] spore` in last 3 days.
 *   - If none → create spore-publish task.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';
import { getDb } from '../db/client.ts';
import { child as childLogger } from '../logger.ts';
import { isPaused } from './cron.ts';
import { createTask, listTasks } from '../tasks/manager.ts';

const log = childLogger({ module: 'scheduler/self-diagnose' });

const DRIFT_THRESHOLD = 1;
const DRIFT_AGE_MS = 180 * 24 * 60 * 60 * 1000; // 6 months

export async function checkOrganDrift(): Promise<void> {
  if (isPaused()) return;
  const knowledge = join(config.repoRoot, 'knowledge');
  if (!existsSync(knowledge)) {
    log.debug('no knowledge/ folder — skipping drift check');
    return;
  }
  const articles = walkMd(knowledge);
  const db = getDb();
  const now = Date.now();
  let updated = 0;
  let queued = 0;

  for (const path of articles) {
    const verified = parseLastVerified(path);
    if (!verified) continue;
    const slug = path.replace(`${config.repoRoot}/`, '');
    const ageMs = now - verified;
    const drifting = ageMs > DRIFT_AGE_MS;

    const existing = db
      .query<
        { drift_score: number; spawned_task_id: string | null },
        [string]
      >('SELECT drift_score, spawned_task_id FROM organ_drift WHERE slug = ?')
      .get(slug);

    let nextScore = existing?.drift_score ?? 0;
    if (drifting) nextScore += 1;
    else nextScore = 0;

    db.run(
      `INSERT INTO organ_drift (slug, last_verified, drift_score, last_checked_at, spawned_task_id)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET
         last_verified = excluded.last_verified,
         drift_score = excluded.drift_score,
         last_checked_at = excluded.last_checked_at`,
      [
        slug,
        new Date(verified).toISOString(),
        nextScore,
        new Date().toISOString(),
        existing?.spawned_task_id ?? null,
      ],
    );
    updated++;

    if (nextScore <= DRIFT_THRESHOLD) continue;
    if (existing?.spawned_task_id) {
      // Don't double-queue if a task is already pending/in-progress.
      const t = listTasks({ limit: 500 }).find(
        (x) => x.id === existing.spawned_task_id,
      );
      if (
        t &&
        (t.status === 'pending' ||
          t.status === 'in-progress' ||
          t.status === 'spawning')
      ) {
        continue;
      }
    }
    const task = createTask({
      type: 'article-evolve',
      boot_profile: 'content-writing',
      priority: 'P2',
      title: `EVOLVE drift: ${slug}`,
      created_by: 'self-diagnose',
      notes: `lastVerified=${new Date(verified).toISOString()} (>6 months); drift score ${nextScore}`,
      inputs: {
        slug,
        last_verified: new Date(verified).toISOString(),
        drift_score: nextScore,
        reason: 'organ-drift',
      },
    });
    db.run('UPDATE organ_drift SET spawned_task_id = ? WHERE slug = ?', [
      task.id,
      slug,
    ]);
    queued++;
  }
  log.info(
    { articles: articles.length, updated, queued },
    'organ drift scan complete',
  );
}

export async function checkNoSpore(): Promise<void> {
  if (isPaused()) return;
  const r = spawnSync(
    'git',
    ['log', '--since=3.days', '--grep=🧬 \\[semiont\\] spore', '--pretty=%H'],
    { cwd: config.repoRoot, encoding: 'utf8' },
  );
  const recentSpores = (r.stdout ?? '').trim();
  if (recentSpores.length > 0) {
    log.info('spore recently published — no action');
    return;
  }
  // Dedup: don't fire if there's already a pending spore-publish task today.
  const today = new Date().toISOString().slice(0, 10);
  const existing = listTasks({ status: 'pending', limit: 200 }).find(
    (t) => t.type === 'spore-publish' && t.created_at.startsWith(today),
  );
  if (existing) return;
  createTask({
    type: 'spore-publish',
    boot_profile: 'spore-publishing',
    priority: 'P2',
    title: '3 days quiet — pick a current event',
    created_by: 'self-diagnose',
    notes:
      'no spore commit in last 3 days. Pick a current event from this week and write a 150-300 char spore per SPORE-PIPELINE.',
    inputs: { reason: '3-day-no-spore' },
  });
  log.info('no-spore detector → spore-publish task created');
}

function walkMd(root: string, out: string[] = []): string[] {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) walkMd(full, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function parseLastVerified(path: string): number | null {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  if (!raw.startsWith('---')) {
    // Fallback: file mtime.
    try {
      return statSync(path).mtimeMs;
    } catch {
      return null;
    }
  }
  const end = raw.indexOf('\n---', 4);
  if (end < 0) return null;
  const fm = raw.slice(0, end);
  const m = fm.match(/^lastVerified:\s*['"]?([\d-]+)['"]?$/m);
  if (!m) {
    try {
      return statSync(path).mtimeMs;
    } catch {
      return null;
    }
  }
  const t = Date.parse(m[1] ?? '');
  return Number.isFinite(t) ? t : null;
}
