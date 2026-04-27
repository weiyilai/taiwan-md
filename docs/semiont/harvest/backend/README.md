# Harvest Backend (Phase 1 MVP)

> Taiwan.md's Orchestrator backend. Watches inboxes, spawns Claude Code
> sessions to execute single tasks, writes a daily status report.
>
> Strategy: see `reports/harvest-engine-strategy-2026-04-27.md` (locked decisions in §8).

## Stack

- Runtime: **Bun 1.3.x**
- HTTP: **Hono**
- Storage: **bun:sqlite** + on-disk task folders under `.harvest/tasks/`
- Cron: pure `setTimeout` (no npm cron deps)
- Logging: **pino** (JSON, pretty in dev)
- Process manager (production): **launchd plist**

## Layout

```
backend/
├── src/
│   ├── server.ts             # Hono entrypoint
│   ├── config.ts             # env loader
│   ├── logger.ts             # pino setup
│   ├── db/                   # SQLite schema + client
│   ├── tasks/                # Task CRUD (folder + DB)
│   ├── intake/               # IntakeAdapter plugin interface + ARTICLE-INBOX watch
│   ├── spawner/              # claude CLI spawner + boot profiles + prompt builder
│   ├── reporter/             # daily report generator
│   ├── scheduler/            # 08:00 cron
│   └── cli/                  # bun-runnable scripts (verify / report / scan)
├── boot-profiles/profiles.yml  # 5 boot profiles per strategy §8.7
├── prompts/                    # one .md per task type (hot-editable)
├── package.json
├── tsconfig.json (strict)
└── .env.example
```

## GitHub webhook (Phase 4)

`POST /api/webhook/github` accepts `pull_request` and `issues` events and
auto-creates harvest tasks for them (deduped by PR/issue number).

Setup:

1. Generate a secret: `openssl rand -hex 32`. Save it as
   `GITHUB_WEBHOOK_SECRET=<hex>` in `backend/.env`.
2. Expose the backend through a tunnel (Cloudflare Tunnel / ngrok / Tailscale
   funnel) — GitHub needs an HTTPS URL it can reach.
3. In the repo Settings → Webhooks → Add webhook:
   - Payload URL: `https://<tunnel>/api/webhook/github`
   - Content type: `application/json`
   - Secret: same hex string
   - Events: pull_request, issues
4. The endpoint returns 503 while no secret is configured — by design, we
   refuse to accept anything we can't verify.

## Auto-spawn loop (Phase 4)

Every `HARVEST_AUTO_SPAWN_POLL_SEC` seconds (default 300) the backend pulls
pending tasks ordered by priority and spawns up to `HARVEST_MAX_CONCURRENT`
of them in parallel, respecting `HARVEST_AUTO_SPAWN_MIN_PRIORITY` (default
P1 — P2/P3 still need manual ▶️). Pause via `POST /api/control/pause`.

## Run

```bash
cd docs/semiont/harvest/backend
bun install
bun run typecheck       # optional: TS strict pass

bun run dev             # HTTP server at :4319 with watch reload
# or
bun run start           # no watch
```

The server creates `.harvest/tasks/` and `reports/harvest/` under the repo root if missing.

## Manual verification (Phase 1 acceptance)

This sequence proves the four MVP components work without firing the real `claude` CLI.

```bash
cd docs/semiont/harvest/backend

# 0. install deps once
bun install

# 1. add a test entry to ARTICLE-INBOX.md, e.g.:
#    ### 測試主題 — Phase 1 MVP 驗證
#    - **Type**: NEW
#    - **Category**: People
#    - **Priority**: P3            ← change to P0 or P1 to make it actionable
#    - **Status**: pending
#    - **Requested**: 2026-04-27 by cheyu (session γ)
#    - **Notes**: 純測試
#
#    The MVP only converts P0/P1 entries into tasks (P3 is intentionally skipped
#    so harmless seed entries don't auto-fire).

# 2. run a one-shot scan (no server needed)
bun run scan-inbox

# 3. inspect task folders
ls -1 ../../../../.harvest/tasks/

# 4. build a spawn prompt for the task we just made
bun run build-prompt 2026-04-27-001-測試主題-phase-1-mvp-驗證

# 5. test prompt builder with a synthetic task (no DB writes)
bun run test:prompt

# 6. generate today's daily report
bun run report
cat ../../../../reports/harvest/$(date +%Y-%m-%d).md

# 7. full end-to-end smoke
bun run verify
```

## HTTP API

All endpoints are JSON. Server listens on `HARVEST_PORT` (default 4319).

| Method | Path                                    | Notes                                                                                |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/api/health`                           | uptime, db_ok, scheduler paused state                                                |
| GET    | `/api/tasks`                            | filter `?status=pending&priority=P0&limit=20`                                        |
| GET    | `/api/tasks/:id`                        | full task.yml                                                                        |
| POST   | `/api/tasks`                            | manual create — body: `{type, boot_profile, priority, title, notes?, dependencies?}` |
| POST   | `/api/tasks/:id/cancel`                 | retire a pending/blocked task                                                        |
| POST   | `/api/tasks/:id/spawn?dry=true`         | build prompt + (optionally) invoke claude CLI                                        |
| GET    | `/api/reports/today`                    | markdown                                                                             |
| GET    | `/api/reports/:date`                    | markdown for YYYY-MM-DD                                                              |
| POST   | `/api/reports/generate?date=YYYY-MM-DD` | force-generate                                                                       |
| POST   | `/api/intake/scan`                      | manual ARTICLE-INBOX rescan                                                          |
| POST   | `/api/control/pause`                    | kill switch — stops cron                                                             |
| POST   | `/api/control/resume`                   | restart cron                                                                         |

## Boot profiles

`boot-profiles/profiles.yml` defines 5 profiles per strategy §8.7. Each profile lists
files a spawned Claude session must read first. **MANIFESTO.md is mandatory** — if
you forget to include it in a profile, the loader auto-injects it and warns.

To add a new task type:

1. Add a new entry under `profiles:` in `profiles.yml` (or reuse an existing profile).
2. Add `prompts/{task-type}.md` with task-specific instructions.
3. Done — no code change needed.

## Data on disk

```
.harvest/                       # gitignored — runtime data
└── tasks/
    └── 2026-04-27-001-沈伯洋/
        ├── task.yml            # source of truth (yaml)
        ├── status.log          # append-only audit trail
        ├── inputs/             # observer materials, research outputs
        ├── outputs/            # session deliverables
        └── sessions/
            ├── <uuid>.prompt.md  # actual prompt sent to claude
            └── <uuid>.log        # combined stdout+stderr
```

## Auth setup for spawned `claude` (CRITICAL)

The harvest backend spawns `claude` CLI as a child process. **launchd-managed processes cannot read the user keychain** (macOS security boundary), so OAuth tokens stored in keychain via `claude setup-token` are invisible to launchd-spawned `claude`. Symptom: every spawn ends in 12 seconds with `401 authentication_error`.

**Why we picked tmux over launchd (Phase 2.5 final pivot)**:

A user-shell tmux session inherits full keychain access. We tested both routes:

- ❌ launchd + `setup-token` keychain → `401 Invalid authentication credentials`
- ❌ launchd + `setup-token` long-lived token in `~/.claude/.credentials.json` → file never written (token still goes to keychain)
- ❌ launchd + `ANTHROPIC_API_KEY` env var with OAuth `sk-ant-oat01-…` token → `Invalid API key` (env var only accepts traditional `sk-ant-api03-…` keys)
- ✅ **tmux session started from interactive shell** → keychain access inherited → spawned `claude` auths via subscription OAuth seamlessly

So we use a tmux session instead of launchd. Trade-off: requires login (no headless boot), but the Mac is always-on logged-in anyway and once started the tmux session detaches and runs forever.

## Deploy via tmux

```bash
# Start (idempotent — no-op if already running)
bash docs/semiont/harvest/backend/tmux/start.sh

# Status — tmux session + HTTP /api/health + active sessions + task counts
bash docs/semiont/harvest/backend/tmux/status.sh

# Attach to interact (ctrl+b d to detach without stopping)
bash docs/semiont/harvest/backend/tmux/attach.sh

# Stop cleanly
bash docs/semiont/harvest/backend/tmux/stop.sh
```

Auto-start at login (optional): add this line to `~/.zprofile` or `~/.zshrc`:

```bash
bash /Users/cheyuwu/Projects/taiwan-md/docs/semiont/harvest/backend/tmux/start.sh
```

`start.sh` is idempotent — safe to run on every shell open.

## Logs

```bash
# Server logs (tmux pipe-pane captures stdout/stderr)
tail -f ~/Library/Logs/taiwan-md-harvest/tmux.log

# Live attach (sees actual pino pretty output in real time, ctrl+b d to detach)
bash docs/semiont/harvest/backend/tmux/attach.sh

# Per-task session logs (always preserved, even if SQLite is wiped)
ls .harvest/tasks/<task-id>/sessions/
```

## What this MVP does NOT do (yet)

Per strategy §8.5, these belong to later phases:

- ❌ Web UI (Phase 2)
- ❌ Telegram push (Phase 2-5)
- ❌ GitHub webhook intake (Phase 4)
- ❌ Self-diagnose intake (Phase 4)
- ❌ Health monitor / 偷懶 detection (Phase 3)
- ❌ Full cron takeover — only daily report, no D+7 spore harvest etc.

## Kill switch

```bash
# pause scheduler (cron stops; HTTP keeps serving)
curl -X POST localhost:4319/api/control/pause

# resume
curl -X POST localhost:4319/api/control/resume
```

To stop the whole server: `Ctrl-C` in dev, `launchctl unload` in production.
