/**
 * In-process cron.
 *
 * Phase 1: daily-report at 08:00 +0800.
 * Phase 4 additions:
 *   - Hourly: PR audit + Issue audit
 *   - Daily 09:00 +0800: contributor thank-you scan
 *   - Daily 10:00 +0800: translation ratio audit
 *   - Daily 11:00 +0800: terminology patrol
 *   - Daily 18:00 +0800: 3-day no-spore detector
 *   - Every 6h: organ drift scan
 */

import { child } from '../logger.ts';
import { generateDailyReport } from '../reporter/daily.ts';
import {
  auditOpenPrs,
  auditOpenIssues,
  scanContributorThankYous,
  auditTranslationRatios,
  patrolTerminology,
} from './maintainer.ts';
import { checkOrganDrift, checkNoSpore } from './self-diagnose.ts';

const log = child({ module: 'scheduler/cron' });

interface DailyJob {
  kind: 'daily';
  name: string;
  hour: number;
  minute: number;
  tzOffsetMin: number;
  run: () => Promise<void> | void;
  timer?: ReturnType<typeof setTimeout>;
}

interface IntervalJob {
  kind: 'interval';
  name: string;
  intervalMs: number;
  run: () => Promise<void> | void;
  timer?: ReturnType<typeof setInterval>;
}

type Job = DailyJob | IntervalJob;

const TAIPEI_OFFSET_MIN = 8 * 60;

const jobs: Job[] = [];

export function scheduleDaily(
  name: string,
  hour: number,
  minute: number,
  run: () => Promise<void> | void,
  tzOffsetMin: number = TAIPEI_OFFSET_MIN,
): void {
  const job: DailyJob = { kind: 'daily', name, hour, minute, tzOffsetMin, run };
  jobs.push(job);
  arm(job);
}

export function scheduleInterval(
  name: string,
  intervalMs: number,
  run: () => Promise<void> | void,
): void {
  const job: IntervalJob = { kind: 'interval', name, intervalMs, run };
  jobs.push(job);
  job.timer = setInterval(async () => {
    if (_paused) return;
    log.info({ job: job.name }, 'cron firing (interval)');
    try {
      await job.run();
    } catch (err) {
      log.error({ job: job.name, err: String(err) }, 'cron job failed');
    }
  }, intervalMs);
  log.info({ job: job.name, intervalMs }, 'interval cron armed');
}

function arm(job: DailyJob): void {
  const delayMs = msUntilNext(job.hour, job.minute, job.tzOffsetMin);
  job.timer = setTimeout(async () => {
    log.info({ job: job.name }, 'cron firing');
    try {
      await job.run();
      log.info({ job: job.name }, 'cron job complete');
    } catch (err) {
      log.error({ job: job.name, err: String(err) }, 'cron job failed');
    } finally {
      arm(job);
    }
  }, delayMs);
  log.info(
    {
      job: job.name,
      fireInMs: delayMs,
      fireInMin: Math.round(delayMs / 60000),
    },
    'cron armed',
  );
}

export function msUntilNext(
  hour: number,
  minute: number,
  tzOffsetMin: number,
): number {
  const now = new Date();
  const nowTz = new Date(now.getTime() + tzOffsetMin * 60_000);
  const targetTz = new Date(nowTz);
  targetTz.setUTCHours(hour, minute, 0, 0);
  if (targetTz <= nowTz) targetTz.setUTCDate(targetTz.getUTCDate() + 1);
  return targetTz.getTime() - nowTz.getTime();
}

export function startScheduler(): void {
  scheduleDaily('daily-report', 8, 0, async () => {
    await generateDailyReport();
  });
  scheduleDaily('contributor-thank-you-scan', 9, 0, async () => {
    await scanContributorThankYous();
  });
  scheduleDaily('translation-ratio-audit', 10, 0, async () => {
    await auditTranslationRatios();
  });
  scheduleDaily('terminology-patrol', 11, 0, async () => {
    await patrolTerminology();
  });
  scheduleDaily('no-spore-detector', 18, 0, async () => {
    await checkNoSpore();
  });

  scheduleInterval('pr-audit', 60 * 60 * 1000, async () => {
    await auditOpenPrs();
  });
  scheduleInterval('issue-audit', 60 * 60 * 1000, async () => {
    await auditOpenIssues();
  });
  scheduleInterval('organ-drift', 6 * 60 * 60 * 1000, async () => {
    await checkOrganDrift();
  });

  log.info({ jobs: jobs.map((j) => j.name) }, 'scheduler started');
}

export function stopScheduler(): void {
  for (const job of jobs) {
    if (job.kind === 'daily' && job.timer) clearTimeout(job.timer);
    if (job.kind === 'interval' && job.timer) clearInterval(job.timer);
    job.timer = undefined;
  }
  jobs.length = 0;
  log.info('scheduler stopped');
}

let _paused = false;
export function pauseScheduler(): void {
  if (_paused) return;
  stopScheduler();
  _paused = true;
}
export function resumeScheduler(): void {
  if (!_paused) return;
  startScheduler();
  _paused = false;
}
export function isPaused(): boolean {
  return _paused;
}
