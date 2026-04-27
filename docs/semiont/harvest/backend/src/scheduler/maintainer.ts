/**
 * Phase 4 — Maintainer pipeline auto-fire.
 *
 * Hourly: PR audit + Issue check (gh CLI polling, dedup via processed_prs/issues).
 * Daily 09:00: contributor thank-you scan.
 * Daily 10:00: translation PR audit (if script present).
 * Daily 11:00: terminology patrol (if script present).
 *
 * Each job respects the global pause flag (cron.isPaused()). Jobs that depend
 * on a script fall back to no-op + a log line if the script doesn't exist —
 * we don't fabricate calls per cheyu's instruction.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.ts';
import { getDb } from '../db/client.ts';
import { child as childLogger } from '../logger.ts';
import { isPaused } from './cron.ts';
import { createTask, listTasks } from '../tasks/manager.ts';

const log = childLogger({ module: 'scheduler/maintainer' });

interface PrSummary {
  number: number;
  title: string;
  author: { login?: string };
  createdAt: string;
  url?: string;
}

interface IssueSummary {
  number: number;
  title: string;
  labels: { name?: string }[];
  url?: string;
}

interface MergedPr {
  number: number;
  title: string;
  author: { login?: string };
  mergedAt: string;
  url: string;
}

function detectRepo(): string | null {
  if (config.githubRepo) return config.githubRepo;
  const r = spawnSync('git', ['config', '--get', 'remote.origin.url'], {
    cwd: config.repoRoot,
    encoding: 'utf8',
  });
  if (r.status !== 0) return null;
  const url = (r.stdout ?? '').trim();
  // Match https://github.com/owner/repo(.git) and git@github.com:owner/repo(.git)
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+?)(\.git)?$/) ?? null;
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

function ghJson<T>(args: string[]): T | null {
  const r = spawnSync('gh', args, {
    cwd: config.repoRoot,
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (r.status !== 0) {
    log.warn(
      { args, stderr: (r.stderr ?? '').slice(0, 500) },
      'gh command failed',
    );
    return null;
  }
  try {
    return JSON.parse(r.stdout ?? '') as T;
  } catch {
    return null;
  }
}

/** Hourly PR audit. */
export async function auditOpenPrs(): Promise<void> {
  if (isPaused()) return;
  const repo = detectRepo();
  if (!repo) {
    log.warn('cannot detect github repo — skipping PR audit');
    return;
  }
  const prs = ghJson<PrSummary[]>([
    'pr',
    'list',
    '--repo',
    repo,
    '--state',
    'open',
    '--json',
    'number,title,author,createdAt,url',
    '--limit',
    '50',
  ]);
  if (!prs) return;

  const db = getDb();
  const seen = new Set(
    db
      .query<{ pr_number: number }, []>('SELECT pr_number FROM processed_prs')
      .all()
      .map((r) => r.pr_number),
  );

  let created = 0;
  for (const pr of prs) {
    if (seen.has(pr.number)) continue;
    const task = createTask({
      type: 'pr-review',
      boot_profile: 'maintainer',
      priority: 'P1',
      title: `PR #${pr.number}: ${pr.title}`,
      created_by: 'maintainer-cron',
      notes: `from gh poll · @${pr.author?.login ?? 'unknown'} · ${pr.url ?? ''}`,
      inputs: {
        pr_number: pr.number,
        pr_url: pr.url ?? '',
        pr_author: pr.author?.login ?? '',
      },
    });
    db.run(
      'INSERT INTO processed_prs (pr_number, task_id, processed_at) VALUES (?, ?, ?)',
      [pr.number, task.id, new Date().toISOString()],
    );
    created++;
  }
  log.info({ repo, scanned: prs.length, created }, 'PR audit complete');
}

/** Hourly Issue audit. */
export async function auditOpenIssues(): Promise<void> {
  if (isPaused()) return;
  const repo = detectRepo();
  if (!repo) return;
  const issues = ghJson<IssueSummary[]>([
    'issue',
    'list',
    '--repo',
    repo,
    '--state',
    'open',
    '--json',
    'number,title,labels,url',
    '--limit',
    '50',
  ]);
  if (!issues) return;

  const db = getDb();
  const seen = new Set(
    db
      .query<{ issue_number: number }, []>(
        'SELECT issue_number FROM processed_issues',
      )
      .all()
      .map((r) => r.issue_number),
  );

  let created = 0;
  for (const issue of issues) {
    if (seen.has(issue.number)) continue;
    const labels = (issue.labels ?? []).map((l) => l.name ?? '');
    if (labels.includes('wontfix') || labels.includes('claude-skip')) continue;
    const task = createTask({
      type: 'issue-handle',
      boot_profile: 'maintainer',
      priority: 'P1',
      title: `Issue #${issue.number}: ${issue.title}`,
      created_by: 'maintainer-cron',
      notes: `from gh poll · ${issue.url ?? ''}`,
      inputs: {
        issue_number: issue.number,
        issue_url: issue.url ?? '',
        labels,
      },
    });
    db.run(
      'INSERT INTO processed_issues (issue_number, task_id, processed_at) VALUES (?, ?, ?)',
      [issue.number, task.id, new Date().toISOString()],
    );
    created++;
  }
  log.info({ repo, scanned: issues.length, created }, 'Issue audit complete');
}

/** Daily 09:00 — scan recently merged PRs and queue thank-yous. */
export async function scanContributorThankYous(): Promise<void> {
  if (isPaused()) return;
  const repo = detectRepo();
  if (!repo) return;
  const prs = ghJson<MergedPr[]>([
    'pr',
    'list',
    '--repo',
    repo,
    '--state',
    'merged',
    '--json',
    'number,title,author,mergedAt,url',
    '--limit',
    '50',
  ]);
  if (!prs) return;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = prs.filter((p) => {
    const t = Date.parse(p.mergedAt);
    return Number.isFinite(t) && t >= cutoff;
  });
  for (const pr of recent) {
    // Dedup: don't queue twice for same PR.
    const existing = listTasks({ limit: 200 }).find(
      (t) =>
        t.type === 'contributor-thank-you' &&
        (t.inputs as Record<string, unknown> | undefined)?.['pr_number'] ===
          pr.number,
    );
    if (existing) continue;
    createTask({
      type: 'contributor-thank-you',
      boot_profile: 'maintainer',
      priority: 'P2',
      title: `Thank @${pr.author?.login ?? 'contributor'} for PR #${pr.number}`,
      created_by: 'maintainer-cron',
      notes: `merged ${pr.mergedAt} · ${pr.url}`,
      inputs: {
        pr_number: pr.number,
        pr_url: pr.url,
        pr_author: pr.author?.login ?? '',
        merged_at: pr.mergedAt,
      },
    });
  }
  log.info({ count: recent.length }, 'thank-you scan complete');
}

/** Daily 10:00 — translation ratio audit (skip if script missing). */
export async function auditTranslationRatios(): Promise<void> {
  if (isPaused()) return;
  const script = join(
    config.repoRoot,
    'scripts/tools/translation-ratio-check.sh',
  );
  if (!existsSync(script)) {
    log.debug('translation-ratio-check.sh missing — skipping');
    return;
  }
  const r = spawnSync('bash', [script, '--all-ja'], {
    cwd: config.repoRoot,
    timeout: 120_000,
    encoding: 'utf8',
  });
  if (r.status === 0) {
    log.info('translation ratios healthy');
    return;
  }
  const output = ((r.stdout ?? '') + (r.stderr ?? '')).slice(0, 4000);
  createTask({
    type: 'article-evolve',
    boot_profile: 'content-writing',
    priority: 'P2',
    title: 'Translation ratio audit failures',
    created_by: 'maintainer-cron',
    notes: `translation-ratio-check.sh exit ${r.status}\n\n${output}`,
    inputs: { reason: 'translation-ratio', exit_code: r.status ?? -1 },
  });
}

/** Daily 11:00 — terminology patrol (skip if script missing). */
export async function patrolTerminology(): Promise<void> {
  if (isPaused()) return;
  // We have terminology-audit.py but no terminology-patrol.sh; cheyu's spec
  // says "if X or similar exists, run; else skip gracefully."
  const candidates = [
    'scripts/tools/terminology-patrol.sh',
    'scripts/tools/terminology-audit.py',
  ];
  const found = candidates
    .map((p) => join(config.repoRoot, p))
    .find((p) => existsSync(p));
  if (!found) {
    log.debug('no terminology patrol script found — skipping');
    return;
  }
  const interp = found.endsWith('.py') ? 'python3' : 'bash';
  const r = spawnSync(interp, [found], {
    cwd: config.repoRoot,
    timeout: 120_000,
    encoding: 'utf8',
  });
  if (r.status === 0) return;
  const output = ((r.stdout ?? '') + (r.stderr ?? '')).slice(0, 4000);
  createTask({
    type: 'article-evolve',
    boot_profile: 'content-writing',
    priority: 'P2',
    title: 'Terminology patrol failures',
    created_by: 'maintainer-cron',
    notes: `${found} exit ${r.status}\n\n${output}`,
    inputs: { reason: 'terminology', exit_code: r.status ?? -1 },
  });
}
