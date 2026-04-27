## Task type: article-evolve

This is an EVOLVE pass on an existing article. Walk REWRITE-PIPELINE Stage 0 (素材萃取) before normal stages 1–6.

- Title: {{task.title}}
- Notes from observer: {{task.notes}}

### Stage 0 specifics

1. Read the current article in full.
2. Inventory: which paragraphs survive, which need fact-check refresh, which should be cut.
3. Write a Stage 0 plan to `{{task.folder_path_relative}}/outputs/stage-0-plan.md` BEFORE editing any production file.

### Procedure (ALL stages mandatory — do not skip 3.5/3.6)

After Stage 0 plan, proceed exactly like article-rewrite. The audit gates apply equally to EVOLVE work — even if you only touched 30% of the article, the touched paragraphs need fresh Stage 3.5/3.6.

1. Stage 1 research → `reports/research/YYYY-MM/{slug}.md`
2. Stage 2 draft (full EDITORIAL.md read mandatory)
3. Stage 3 fact triangle (arithmetic / units / direct quotes 3x check)
4. **Stage 3.5 hallucination audit (REQUIRED)** → `reports/research/YYYY-MM/{slug}-stage35-audit.md`. Walk every changed factual claim against source. Use the template in `article-rewrite.md`.
5. **Stage 3.6 atom audit (REQUIRED)** → `reports/research/YYYY-MM/{slug}-stage36-audit.md`. Each fact attributable to one source.
6. **GATE: Stage 4 polish does NOT start until both audit files exist on disk.**
7. Stage 4 polish (`docs/editorial/QUALITY-CHECKLIST.md`)
8. **Stage 5 commit**: pre-commit hook is the final gate. **If it fails, do NOT bypass with `--no-verify`. Fix the underlying issue and commit again.** Bypassing the hook is a 偷懶 marker the harvest engine actively detects.

Append `Stage 3.5: PASS` and `Stage 3.6: PASS` lines to `{{task.folder_path_relative}}/status.log` before exiting.
