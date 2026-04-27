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

The harvest backend spawns `claude` CLI under launchd. **launchd processes can't read the user keychain** (macOS security boundary), so the OAuth token used by interactive `claude` sessions is invisible to harvest. Symptom: every spawn ends in 12 seconds with `401 authentication_error`.

**Fix — long-lived token (recommended)**:

```bash
# Run ONCE interactively as cheyu (browser flow opens). Writes long-lived
# token to ~/.claude/.credentials.json (file-based, not keychain).
~/.bun/bin/claude setup-token
```

Then ensure the launchd plist exposes `HOME`/`USER`/`LOGNAME` so the spawned
`claude` can find the file. The shipped `launchd/md.taiwan.harvest.plist`
already has these env vars from Phase 2.5.

After running `setup-token` once, restart the harvest agent:

```bash
launchctl kickstart -k gui/$UID/md.taiwan.harvest
```

Verify by spawning a small task — session log should NOT contain `401`.

**Alt — API key**:

If you have an `ANTHROPIC_API_KEY` and prefer API billing over subscription:

1. Uncomment `ANTHROPIC_API_KEY` block in plist with your key
2. The spawner already passes `--bare` so the CLI strictly uses the env var
3. Restart agent

## Deploy as a launchd service

```xml
<!-- ~/Library/LaunchAgents/md.taiwan.harvest.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>             <string>md.taiwan.harvest</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/cheyuwu/.bun/bin/bun</string>
    <string>run</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key>  <string>/Users/cheyuwu/Projects/taiwan-md/docs/semiont/harvest/backend</string>
  <key>KeepAlive</key>          <true/>
  <key>RunAtLoad</key>          <true/>
  <key>StandardOutPath</key>    <string>/Users/cheyuwu/Projects/taiwan-md/.harvest/launchd.out.log</string>
  <key>StandardErrorPath</key>  <string>/Users/cheyuwu/Projects/taiwan-md/.harvest/launchd.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>/Users/cheyuwu/.bun/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HARVEST_LOG_PRETTY</key><string>false</string>
  </dict>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/md.taiwan.harvest.plist
launchctl unload ~/Library/LaunchAgents/md.taiwan.harvest.plist
```

## Logs

```bash
# Server logs (when running via launchd)
tail -f .harvest/launchd.out.log
tail -f .harvest/launchd.err.log

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
