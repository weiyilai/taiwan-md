/**
 * Phase 4 — GitHub webhook receiver.
 *
 * Endpoint: POST /api/webhook/github
 *
 * Headers we care about:
 *   - X-Hub-Signature-256: sha256=<hex>  (HMAC of body using GITHUB_WEBHOOK_SECRET)
 *   - X-GitHub-Event: pull_request | issues | ping
 *
 * Behaviour:
 *   - 401 if signature mismatches
 *   - 503 if no secret configured (refuse to accept anything we can't verify)
 *   - 200 quickly; task creation is fire-and-forget, no synchronous spawn
 *
 * Setup (see backend/README.md):
 *   1. Generate secret: `openssl rand -hex 32`, save to backend/.env as
 *      GITHUB_WEBHOOK_SECRET=...
 *   2. In GitHub repo Settings → Webhooks → Add webhook:
 *      - Payload URL: https://<your tunnel>/api/webhook/github
 *      - Content type: application/json
 *      - Secret: same hex string
 *      - Events: Pull requests, Issues
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.ts';
import { getDb } from '../db/client.ts';
import { child as childLogger } from '../logger.ts';
import { createTask } from '../tasks/manager.ts';

const log = childLogger({ module: 'webhook/github' });

export interface WebhookResult {
  status: number;
  body: { ok?: boolean; error?: string; task_id?: string; event?: string };
}

interface GhUser {
  login?: string;
}

interface GhPullRequest {
  number: number;
  title: string;
  user?: GhUser;
  html_url?: string;
  body?: string | null;
}

interface GhIssue {
  number: number;
  title: string;
  user?: GhUser;
  html_url?: string;
  body?: string | null;
  pull_request?: unknown;
  labels?: { name?: string }[];
}

interface PullRequestPayload {
  action?: string;
  pull_request?: GhPullRequest;
}

interface IssuesPayload {
  action?: string;
  issue?: GhIssue;
}

export function verifySignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!config.githubWebhookSecret) return false;
  if (!signature) return false;
  const expected =
    'sha256=' +
    createHmac('sha256', config.githubWebhookSecret)
      .update(rawBody, 'utf8')
      .digest('hex');
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function handleGithubWebhook(
  rawBody: string,
  headers: { signature: string | null; event: string | null },
): Promise<WebhookResult> {
  if (!config.githubWebhookSecret) {
    return {
      status: 503,
      body: { error: 'GITHUB_WEBHOOK_SECRET not configured' },
    };
  }
  if (!verifySignature(rawBody, headers.signature)) {
    return { status: 401, body: { error: 'invalid signature' } };
  }
  const event = headers.event ?? '';
  if (event === 'ping') {
    return { status: 200, body: { ok: true, event: 'ping' } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: 'invalid json' } };
  }

  if (event === 'pull_request') {
    return handlePullRequest(parsed as PullRequestPayload);
  }
  if (event === 'issues') {
    return handleIssues(parsed as IssuesPayload);
  }
  log.debug({ event }, 'ignored event');
  return { status: 200, body: { ok: true, event } };
}

function handlePullRequest(payload: PullRequestPayload): WebhookResult {
  const action = payload.action ?? '';
  const pr = payload.pull_request;
  if (!pr)
    return { status: 400, body: { error: 'no pull_request in payload' } };
  if (action !== 'opened' && action !== 'edited' && action !== 'reopened') {
    return { status: 200, body: { ok: true, event: `pr.${action}.ignored` } };
  }
  const db = getDb();
  const existing = db
    .query<
      { task_id: string | null },
      [number]
    >('SELECT task_id FROM processed_prs WHERE pr_number = ?')
    .get(pr.number);
  if (existing) {
    return {
      status: 200,
      body: { ok: true, event: 'pr.dedup', task_id: existing.task_id ?? '' },
    };
  }
  const notes = [
    `PR #${pr.number} from @${pr.user?.login ?? 'unknown'}`,
    pr.html_url ? `URL: ${pr.html_url}` : '',
    pr.body ? `\nBody:\n${pr.body.slice(0, 2000)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const task = createTask({
    type: 'pr-review',
    boot_profile: 'maintainer',
    priority: 'P1',
    title: `PR #${pr.number}: ${pr.title}`,
    created_by: 'github-webhook',
    notes,
    inputs: {
      pr_number: pr.number,
      pr_url: pr.html_url ?? '',
      pr_author: pr.user?.login ?? '',
    },
  });
  db.run(
    'INSERT INTO processed_prs (pr_number, task_id, processed_at) VALUES (?, ?, ?)',
    [pr.number, task.id, new Date().toISOString()],
  );
  return {
    status: 200,
    body: { ok: true, event: 'pr.created', task_id: task.id },
  };
}

function handleIssues(payload: IssuesPayload): WebhookResult {
  const action = payload.action ?? '';
  const issue = payload.issue;
  if (!issue) return { status: 400, body: { error: 'no issue in payload' } };
  if (issue.pull_request) {
    return { status: 200, body: { ok: true, event: 'issues.is_pr.ignored' } };
  }
  if (action !== 'opened' && action !== 'edited' && action !== 'reopened') {
    return {
      status: 200,
      body: { ok: true, event: `issues.${action}.ignored` },
    };
  }
  const labels = (issue.labels ?? []).map((l) => l.name ?? '');
  if (labels.includes('wontfix') || labels.includes('claude-skip')) {
    return { status: 200, body: { ok: true, event: 'issues.skip-label' } };
  }
  const db = getDb();
  const existing = db
    .query<
      { task_id: string | null },
      [number]
    >('SELECT task_id FROM processed_issues WHERE issue_number = ?')
    .get(issue.number);
  if (existing) {
    return {
      status: 200,
      body: {
        ok: true,
        event: 'issues.dedup',
        task_id: existing.task_id ?? '',
      },
    };
  }
  const notes = [
    `Issue #${issue.number} from @${issue.user?.login ?? 'unknown'}`,
    issue.html_url ? `URL: ${issue.html_url}` : '',
    issue.body ? `\nBody:\n${issue.body.slice(0, 2000)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const task = createTask({
    type: 'issue-handle',
    boot_profile: 'maintainer',
    priority: 'P1',
    title: `Issue #${issue.number}: ${issue.title}`,
    created_by: 'github-webhook',
    notes,
    inputs: {
      issue_number: issue.number,
      issue_url: issue.html_url ?? '',
      issue_author: issue.user?.login ?? '',
      labels,
    },
  });
  db.run(
    'INSERT INTO processed_issues (issue_number, task_id, processed_at) VALUES (?, ?, ?)',
    [issue.number, task.id, new Date().toISOString()],
  );
  return {
    status: 200,
    body: { ok: true, event: 'issues.created', task_id: task.id },
  };
}
