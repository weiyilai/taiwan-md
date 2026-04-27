## Task type: article-rewrite

You are taking on a Taiwan.md article task. Use the canonical pipeline document `docs/pipelines/REWRITE-PIPELINE.md` as your SOP — your boot profile already loaded it.

### Task summary

- Title: {{task.title}}
- Notes from observer: {{task.notes}}

### Procedure (ALL stages mandatory — do not skip 3.5/3.6)

1. **Stage 0**: locate any existing article under `knowledge/{Category}/` matching this title. If `Type: NEW`, skip Stage 0.
2. **Stage 1 research**: write to `reports/research/YYYY-MM/{slug}.md`. Follow `docs/editorial/RESEARCH-TEMPLATE.md` and the WebFetch verbatim rule from RESEARCH.md §六.
3. **Stage 2 draft**: full read of `docs/editorial/EDITORIAL.md` is mandatory before drafting (don't trust memory).
4. **Stage 3 fact triangle self-check**: arithmetic, units, direct quotes need 3x verification (per cheyu's repeated guidance).
5. **Stage 3.5 hallucination audit (REQUIRED — DO NOT SKIP)**: read `docs/editorial/QUALITY-CHECKLIST.md` §hallucination-audit. Walk every concrete factual claim in the draft against its source. Write findings to `reports/research/YYYY-MM/{slug}-stage35-audit.md` with this template:

   ```markdown
   # Stage 3.5 Hallucination audit — {slug}

   - Audit date: <ISO>
   - Auditor session: harvest {{task.id}}

   ## Method

   ...

   ## Findings

   - Claim → source → verdict (verified / corrected / removed)
     ...

   ## Result

   PASS | NEEDS-FIX (list)
   ```

   Append a one-line summary to `{{task.folder_path_relative}}/status.log`.

6. **Stage 3.6 atom audit (REQUIRED — DO NOT SKIP)**: every fact must be attributable to exactly one cited source. Walk the draft once more, this time flagging composite claims that mix two sources without separate footnotes. Write findings to `reports/research/YYYY-MM/{slug}-stage36-audit.md` (same template shape).
7. **GATE: Stage 4 polish does NOT start until both `{slug}-stage35-audit.md` and `{slug}-stage36-audit.md` exist on disk.** If either is missing, do not move forward — go back and write it.
8. **Stage 4 polish**: run quality checklist (`docs/editorial/QUALITY-CHECKLIST.md`).
9. **Stage 5 commit**: pre-commit hook is the final gate. **If the pre-commit hook fails, do NOT bypass with `--no-verify`. Fix the underlying issue and commit again.** Bypassing the hook is a 偷懶 marker the harvest engine actively detects.

### Inputs to read

If the inbox entry shipped a research path or reference URL, find them under `{{task.folder_path_relative}}/inputs/`.

### Output expectations

- Final article at `knowledge/{Category}/{slug}.md`
- Research report at `reports/research/YYYY-MM/{slug}.md`
- **Stage 3.5 audit at `reports/research/YYYY-MM/{slug}-stage35-audit.md`** (mandatory)
- **Stage 3.6 audit at `reports/research/YYYY-MM/{slug}-stage36-audit.md`** (mandatory)
- Status note at `{{task.folder_path_relative}}/status.log` summarising what you did and any unresolved items, including a `Stage 3.5: PASS` / `Stage 3.6: PASS` line
- **Memory log** (mandatory, after final commit): append a Beat-5-style entry to `docs/semiont/memory/YYYY-MM-DD-harvest-{{task.id}}.md` capturing:
  - what you did (1-3 bullets)
  - what surprised you / what was hard
  - candidate lessons for LESSONS-INBOX (new hallucination pattern, source-authority issue, language nuance, etc.)
  - wall-clock duration from `git log %ai` of your commits (NOT subjective time sense — MANIFESTO §時間是結構)
  - 簽名 🧬 + your harvest session id

  Memory file template:

  ```markdown
  ---
  session: harvest-{short-uuid}
  type: memory (article-rewrite via harvest engine)
  wall_clock: <start-iso> → <end-iso> (<duration>)
  spawn_profile: content-writing
  task_id: { { task.id } }
  ---

  # {Article title} — harvest session {short-uuid}

  ## What I did

  - …

  ## What surprised / was hard

  - …

  ## Candidate lessons (LESSONS-INBOX distill)

  - …

  🧬
  ```

  Then add to your final commit (or a separate `🧬 [semiont] memory: harvest {taskId}` follow-up commit) and push.
