# CLI Release Workflow

Taiwan.md CLI (`taiwanmd`) publishes to npm automatically when you push a tag
prefixed with `cli-v`. GitHub Actions runs tests, verifies the tag matches
`cli/package.json`'s version, and publishes with npm provenance.

> ## 🔀 獨立於 site release
>
> CLI 有**自己的 release 管線**（本文件），跟 [Taiwan.md site release](../docs/pipelines/RELEASE-PIPELINE.md) 並存但不硬整合：
>
> - CLI 可以 ship（加新指令）而不動 knowledge
> - site 可以 ship（更新文章 / UI）而不動 CLI
> - 版本軸線獨立：site v1.2.x vs CLI v0.6.x
>
> **例外：schema contract**
>
> CLI 消費 `public/api/dashboard-*.json` 的 schema。如果 site release 引入
> schema breaking change（欄位改名、型別改變、欄位刪除），**必須**在 site
> `RELEASE-PIPELINE.md` §Breaking changes 下同時記錄「需要 bump CLI major」
> 並觸發一次 CLI release。schema additive change（純新增欄位）不強制。

## One-time setup

### 1. Create an npm automation token

1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. **Generate New Token → Classic Token → Automation**
   (automation tokens skip the 2FA/OTP prompt in CI)
3. Copy the token (starts with `npm_`)

### 2. Add the token to the GitHub repo

1. Go to https://github.com/frank890417/taiwan-md/settings/secrets/actions
2. **New repository secret**
   - Name: `NPM_TOKEN`
   - Value: the token from step 1
3. Save

### 3. Verify

Push any `cli-v*` tag — the workflow at `.github/workflows/npm-publish-cli.yml`
will trigger. Watch at https://github.com/frank890417/taiwan-md/actions.

## Releasing a new version

Two paths — both end up pushing a `cli-v<version>` tag, which triggers the
workflow.

### Option A: one-command script

```bash
cd cli
scripts/release.sh patch   # 0.6.1 → 0.6.2
scripts/release.sh minor   # 0.6.1 → 0.7.0
scripts/release.sh major   # 0.6.1 → 1.0.0
scripts/release.sh 0.6.5   # explicit version
```

The script:

1. Runs tests
2. Bumps `cli/package.json`
3. Commits + tags `cli-v<new>`
4. Pushes — GitHub Actions publishes

### Option B: manual

```bash
cd cli
npm version patch --no-git-tag-version   # bump package.json only
cd ..
git add cli/package.json cli/package-lock.json
git commit -m "🧬 [semiont] evolve: CLI v0.6.2"
git tag cli-v0.6.2
git push origin HEAD cli-v0.6.2
```

## The workflow's safety checks

1. **Tag ↔ `package.json` version match** — if you tag `cli-v0.7.0` but
   `package.json` says `0.6.1`, the workflow fails fast.
2. **`npm test` must pass** — vitest suite runs before publish.
3. **Provenance** — `npm publish --provenance` publishes a signed attestation
   proving the package was built from this exact workflow run. Users can
   verify at https://www.npmjs.com/package/taiwanmd (Provenance tab).

## If a publish fails

- **Tag mismatch** — fix `package.json`, delete the bad tag
  (`git tag -d cli-v0.7.0 && git push origin :cli-v0.7.0`), re-tag, re-push.
- **Tests fail** — fix locally, amend the commit, force-retag if needed.
- **`NPM_TOKEN` invalid** — regenerate the automation token on npm and update
  the repo secret.
- **Name conflict** — a version can't be re-published. Bump and try again.

## Why this over manual `npm publish`?

- **No local OTP prompt** — automation tokens bypass 2FA in CI
- **Reproducible** — every release is traceable to a specific commit + workflow run
- **Signed** — provenance attestation is cryptographic proof of origin
- **Pre-publish tests** — can't ship a broken CLI
- **Clean working tree** — no accidental bundling of local debugging changes

## Version conventions

`taiwanmd` follows semver from v1.0.0 onward (see roadmap
`reports/cli-evolution-roadmap-2026-04-20.md`). Pre-1.0:

- **patch** — bug fixes, documentation, internal refactor
- **minor** — new commands, new flags, new output fields
- **major** — breaking changes to `--json` schema, removed commands

From v1.0.0, strict semver.
