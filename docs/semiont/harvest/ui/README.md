# 🧬 Harvest UI — Phase 2 Web Dashboard

Astro + Solid.js islands dashboard for the Taiwan.md Harvest engine
(Phase 2 of the Harvest Engine roadmap, per
`reports/harvest-engine-strategy-2026-04-27.md` §3.1 and §8.3).

## Tech stack

- **Astro 5** — multi-page shell, SSR-by-default with islands for interactivity
- **Solid.js** islands (`client:load`) — fine-grained reactivity, ~5x lighter than React
- **TanStack Query (Solid)** — all data fetching, polling, retries, cache
- **Tailwind CSS** — utility-only styling, dark theme tokens in `tailwind.config.mjs`
- **ECharts** — radar (organ harmony) + line chart (history)
- **marked** — daily report markdown rendering
- **Bun** — package manager + runtime

## Run

```bash
cd docs/semiont/harvest/ui
bun install
bun run dev          # → http://localhost:4321
```

The UI talks to the backend at `http://localhost:4319` by default. Override
with the `PUBLIC_HARVEST_API` env var if needed:

```bash
PUBLIC_HARVEST_API=http://localhost:9000 bun run dev
```

## Build (optional)

```bash
bun run build        # outputs static SSR assets to dist/
bun run preview      # serve the production build locally
bunx astro check     # type-check astro+solid
```

## Backend dependency

The UI assumes the harvest backend is running at `:4319` and exposes:

- `/api/health` — health + scheduler state (polled every 5s)
- `/api/vitals` — organ scores (proxy of `public/api/dashboard-organism.json`)
- `/api/tasks` — list/filter (polled every 5s)
- `/api/tasks/:id` — full task detail (polled when drawer open)
- `POST /api/tasks` — create from manual-input form
- `POST /api/tasks/:id/cancel` — cancel pending/blocked
- `POST /api/tasks/:id/spawn?dry=true` — preview prompt
- `/api/reports/today` and `/api/reports/:date` — markdown
- `POST /api/reports/generate` — re-generate daily report
- `POST /api/control/pause` / `/resume` — kill switch
- `POST /api/intake/scan` — manual inbox sweep

CORS for `localhost:*` is enabled in the backend.

## Sections (per strategy §3.4)

1. **生命徵象** — 8 organ score cards + radar chart
2. **今日任務** — active + recent-pending tasks
3. **任務佇列** — all tasks, filterable, sortable, clickable for drawer
4. **每日 status report** — markdown viewer + date picker + re-generate
5. **Session 監控** — task-grouped session list, latest first
6. **手動操作** — drop topic form + scheduler controls
7. **歷史 log** — terminal tasks grouped by date + line chart

## File layout

```
ui/
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── package.json
├── public/
│   └── favicon.svg
└── src/
    ├── env.d.ts
    ├── layouts/Layout.astro
    ├── pages/index.astro                 (composes all 7 sections)
    ├── styles/global.css
    ├── components/
    │   ├── BackendStatusBanner.tsx
    │   ├── VitalRadar.tsx                (Section 1)
    │   ├── TodayTasks.tsx                (Section 2)
    │   ├── TaskQueue.tsx                 (Section 3)
    │   ├── DailyReport.tsx               (Section 4)
    │   ├── SessionMonitor.tsx            (Section 5)
    │   ├── ManualInput.tsx               (Section 6)
    │   ├── HistoryLog.tsx                (Section 7)
    │   ├── TaskRow.tsx                   (shared)
    │   └── TaskDetailDrawer.tsx          (shared)
    └── lib/
        ├── api.ts                        (typed fetch wrappers)
        ├── types.ts                      (mirror of backend Task types)
        ├── format.ts                     (badges, emojis, relative time)
        └── query-client.ts               (singleton TanStack Query client)
```

## UX rules baked in

- All polling via TanStack Query — no raw fetch in components
- 5s cadence for tasks/health, 30s for vitals/reports
- Skeleton loaders on first load — never blank
- 2 consecutive `/api/health` failures → red "Backend offline" banner
- Scheduler-paused state surfaces an amber banner
- Keyboard accessible: every clickable row is a real `<button>`
- Pure system fonts — no external font CDN

## Notes / open questions for cheyu

- Log streaming for active sessions is Phase 3 — current Section 5
  shows session metadata + commits only.
- The vitals radar reuses the main site's `dashboard-organism.json`. Two
  new backend endpoints (`/api/vitals`, `/api/analytics`) proxy that file
  so the UI doesn't need to read disk paths from the browser.
- Telegram push of daily reports stays in the backend cron — UI is
  read-only for reports (plus re-generate trigger).
