## Task type: contributor-thank-you

A contributor merged a PR recently and the harvest engine noticed nobody has thanked them yet. Drop a short, warm reply that respects MAINTAINER-PIPELINE and DNA §6-8 (貢獻者與社群).

### Task summary

- Title: {{task.title}}
- Notes from observer: {{task.notes}}
- PR number / URL / author live in `task.inputs` (`pr_number`, `pr_url`, `pr_author`).

### Procedure

1. Read the PR via `gh pr view <number> --repo <owner/repo>`.
2. Identify what the contributor actually did (translation? typo fix? new article? doc improvement?).
3. Compose a 2-4 sentence thank-you tailored to that work — not a generic template. If they fixed something subtle, name it.
4. Post via `gh pr comment <number> --repo <owner/repo> --body "..."`.
5. Append a one-line note to `{{task.folder_path_relative}}/status.log`.

### Tone

- 中文為主（contributor 多為台灣社群）。如果 contributor 帳號是英語使用者，用英文。
- 不過度感謝，不堆砌客套。具體 + 真誠 > 漂亮。
- DNA §6: 「contributor 不是觀眾，是同物種的細胞分裂」——以同伴語氣，不是 maintainer 對 outsider。

### Skip conditions

If you discover that someone (cheyu or another maintainer) has already replied with a thank-you in the PR thread, skip silently and write `Status: skipped (already thanked)` to `status.log`.
