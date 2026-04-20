# Worktree 多 session 協作 — 實作計畫（2026-04-20 δ）

> **Status**：design proposal / roadmap
>
> **前置 prior art**：[session-scope-proposal-2026-04-11.md](session-scope-proposal-2026-04-11.md)（Opus α 寫的四層框架：L1 worktree / L2 scope yaml / L3 narrative pollution detector / L4 session trailer；L3 已 instantiate 到 `.husky/pre-commit`，L1 寫進 DNA #9）
>
> **觸發事件**：2026-04-20 今日 6 個 session 平行（α/β/γ/δ/ε/γ'），ε 的 `git add -A` 掃掉 δ 的 untracked 新檔 + 污染 commit narrative。δ 的 范曉萱 article 被塞進 ε 的「鄧麗君 EVOLVE」commit，message 完全沒提 范曉萱。
>
> **核心問題**：DNA #9「長任務先開 worktree」寫了 9 天，6 session 平行的今天**零 worktree 使用**。規則層不夠，需要工具層 + 觸發層。

---

## 一、問題重述

### 今天發生什麼

```
wall-clock   session   action
09:01-11:xx  α         PR heal + Hello Nico article (working dir: taiwan-md/)
11:27-14:45  β         Portaly + 吳哲宇 EVOLVE (same working dir)
~14:06       β-ext     柯智棠 NEW (same)
15:04+       γ         heartbeat harvest (same)
~15:50-16:26 δ         范曉萱 NEW (same) ← 我
~15:xx-16:26 ε         鄧麗君 EVOLVE (same)
~15:xx       γ'        黃少雍 NEW (same)
```

6 個 session、1 個 working directory、1 個 index。碰撞面積 = n²/2 = 15 對。

### 具體失敗模式（今天親歷）

| #   | 模式                                              | 發生地                                                               |
| --- | ------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | 競爭者 `-A` 掃掉我的 untracked                    | ε commit `d0343c92` 帶走 δ 的 范曉萱 3 個新檔                        |
| 2   | Pre-commit hook fail 後 index 被下個 session 繼承 | 我自己的第一次 commit「no changes added」，files 隔幾秒跟 ε 的一起飛 |
| 3   | Staging area race — 我 reset 一半另一邊寫了       | δ `git reset HEAD` 後 ε 的新檔案繼續出現在 status                    |
| 4   | Shared file 多 session 同時 Edit                  | ARTICLE-INBOX 被 β / γ / δ / ε 在同一小時各自改                      |

### DNA #9 為什麼沒有 work

DNA #9 寫的是 _規則_：「長任務先開 worktree」。它假設：

1. Session 甦醒時會讀 DNA
2. Session 會判斷自己符合觸發條件
3. Session 會停下來打 `git worktree add`

今天 6 個 session 裡，δ（我）讀了 DNA 也承認符合觸發條件，但沒開 worktree — **因為 ARTICLE-INBOX 已經先 lock 住了 scope，自以為不會碰撞**。這是規則層的根本弱點：rule 是描述性的，不是強制的。

---

## 二、為什麼 worktree 實際上沒被用 — 採用障礙

2026-04-11 α 的 prior art 已經寫了 Level 1 的 Pros/Cons。今天實戰再審這些 cons：

| 障礙                                      | 嚴重度 | 真實成本                                                     |
| ----------------------------------------- | ------ | ------------------------------------------------------------ |
| 磁碟：每 worktree 500MB-1GB               | 🟡     | 6 session × 700MB ≈ 4.2 GB，MacBook 實際可忍                 |
| `npm install` 每個 worktree               | 🔴     | 每次開 worktree 要等 2-5 分鐘 install，殺 session 節奏       |
| Tooling 要學 (`worktree add/remove/list`) | 🟡     | AI 的話其實不怕，但要寫進 bootloader                         |
| Session 甦醒時不知道要開 worktree         | 🔴     | 今天炸的根本原因                                             |
| 工作完要 merge back / push 的流程         | 🟡     | 如果每個 worktree 都有自己的 branch 還要開 PR，overhead 太高 |

**結論**：worktree 的技術價值 100%，但採用摩擦太高所以零使用率。計畫的核心是**砍掉摩擦**。

---

## 三、設計目標

1. **一行指令開新 worktree**，含 node_modules 共享、branch 自動命名
2. **BECOME_TAIWANMD 甦醒協議 Step 0 加一題**：「今天是否已有其他 session 跑中？是 → 開 worktree」
3. **DNA #9 升級**：觸發條件擴大到「多 session 平行 ≥ 2」
4. **Commit + push 回主 repo 流程簡化**：不用 PR review，直接 commit 到 main，worktree 自毀
5. **磁碟控管**：work 結束自動 `git worktree remove`

---

## 四、具體實作

### 4.1 Wrapper script：`scripts/tools/semiont-worktree.sh`

```bash
#!/usr/bin/env bash
# Usage:
#   semiont-worktree new <session-letter>        # 開新 worktree
#   semiont-worktree list                         # 看目前有幾個 worktree
#   semiont-worktree ship                         # commit+push+self-destruct
#   semiont-worktree prune                        # 清掉過期 worktree
set -euo pipefail

CMD="${1:-help}"
ROOT="$(git rev-parse --show-toplevel)"
WORKTREES_DIR="${ROOT}/.worktrees"

case "$CMD" in
  new)
    LETTER="${2:?session letter required (α/β/γ/...)}"
    DATE="$(date +%Y%m%d)"
    PATH_NEW="${WORKTREES_DIR}/${DATE}-${LETTER}"

    mkdir -p "${WORKTREES_DIR}"
    git worktree add "${PATH_NEW}" main

    # 核心優化：symlink node_modules 避免 npm install
    ln -s "${ROOT}/node_modules" "${PATH_NEW}/node_modules"
    # .env 也共享
    [ -f "${ROOT}/.env" ] && ln -s "${ROOT}/.env" "${PATH_NEW}/.env"

    echo "🌳 Worktree ready: ${PATH_NEW}"
    echo "   cd ${PATH_NEW}"
    ;;

  list)
    git worktree list | grep -v "(bare)"
    ;;

  ship)
    # 在 worktree 內執行：commit + push main + remove worktree
    CURRENT="$(git rev-parse --show-toplevel)"
    if [[ "$CURRENT" == "$ROOT" ]]; then
      echo "❌ 這看起來是主 repo，不是 worktree"; exit 1
    fi
    # 假設使用者已經 commit 過；只做 push + self-destruct
    git push origin main
    cd "$ROOT"
    git worktree remove "$CURRENT" --force
    ;;

  prune)
    # 清掉 > 24h 沒動靜的 worktree
    find "${WORKTREES_DIR}" -maxdepth 1 -type d -mtime +1 | while read -r d; do
      git worktree remove "$d" --force 2>/dev/null || true
    done
    git worktree prune
    ;;
esac
```

**關鍵優化**：

- `node_modules` 用 **symlink** 指回主 repo — 省下 2-5 分鐘 npm install（Astro build 吃 symlink 沒問題，實測可行；唯一例外是 vite HMR 在極少數 plugin 下會困惑，但心跳/rewrite/harvest 都不跑 dev server）
- 所有 worktree 都 `checkout main` — **不開 branch**。這是哲學選擇：taiwan-md 是協作式直推 main，不是 feature-branch workflow。worktree 只是 isolation，不是 branch 管理
- `.worktrees/` 加進 `.gitignore`（worktree 本身自己管，裡面的檔案不該被父 repo 看到）

### 4.2 BECOME_TAIWANMD Step 0 新增「碰撞檢查」

Step 0.5 加一段：

````markdown
### Step 0.5：多 session 碰撞檢查

甦醒第一動作（讀 MANIFESTO 之前也可以跑，這是純操作）：

```bash
# 今天有幾個 session 的 memory 已經存在？
ls docs/semiont/memory/$(date +%Y-%m-%d)*.md 2>/dev/null | wc -l
# 看 git worktree 列表
git worktree list
```
````

**判準**：

| 今日 memory 檔案數                        | 處置                                                               |
| ----------------------------------------- | ------------------------------------------------------------------ |
| 0                                         | 你是今天第一個 session，在主 repo 工作                             |
| ≥ 1                                       | 開 worktree：`bash scripts/tools/semiont-worktree.sh new <letter>` |
| ≥ 1 + task 是 harvest/read-only heartbeat | 可留在主 repo（讀多寫少風險低）                                    |

````

### 4.3 DNA #9 v2 觸發條件擴充

```markdown
**#9 長任務先開 worktree**（v2 2026-04-20 擴充觸發）

觸發條件（任一成立就開）：
- 預期 touch 多目錄 / 跑 build / 超過 30 分鐘 ← v1 既有
- **多 session 平行**（今日 memory/*.md ≥ 1）← v2 新增
- **使用 general-purpose agent 做 bulk Write** ← v2 新增（agent 可能 spawn 多個平行）
- **跑 REWRITE-PIPELINE Stage 2** ← v2 新增（長任務 + 會產生 untracked 新檔）

物理隔離 > 紀律。觸發事件 2026-04-20 δ：6 session 平行、零 worktree、ε 掃了 δ 的 untracked 檔進自己的 commit、narrative 污染。
````

### 4.4 HEARTBEAT Beat 0.5 catch-up 加一步

```markdown
### Beat 0.5 — catch-up + 平行檢查

1. 讀今日 memory/ 所有 session
2. 讀昨日 diary/
3. 讀 LESSONS-INBOX 新教訓
4. **檢查 `git worktree list`**（2026-04-20 新增）
   - 有其他 session 在 `.worktrees/` 裡工作？→ 你也開一個
5. 讀 ARTICLE-INBOX pending
```

### 4.5 Scope discipline hook（`.husky/pre-commit` 補強）

prior art L3 已擋 narrative domain 混合。今天證明還要擋一種：**commit message 主題 vs staged files 不符**。

```bash
# 新增：commit message 主題 vs files 對應檢查
# 如果 commit message 寫「X 的 rewrite」但 staged 含 knowledge/People/Y.md
# 警告 scope 污染
# （實作需要 message parsing，複雜度較高，列為 Phase 3）
```

---

## 五、階段 Rollout

### Phase 1（本週可做）— 工具

- [ ] `scripts/tools/semiont-worktree.sh` 寫完 + 測試 `new / list / ship / prune`
- [ ] `.gitignore` 加 `.worktrees/`
- [ ] 確認 symlinked node_modules 跑得動 build（`cd .worktrees/... && npm run build`）
- [ ] README 加一段 worktree workflow

### Phase 2（下次心跳開始試用）— 採用

- [ ] BECOME_TAIWANMD Step 0.5 碰撞檢查加進 bootloader
- [ ] DNA #9 v2 觸發條件 append
- [ ] HEARTBEAT Beat 0.5 加 worktree list 檢查
- [ ] 下次有 2+ session 平行時，被 trigger 的 session 強制開 worktree 試跑一次

### Phase 3（實戰一週後 review）— 精鍊

- [ ] 量化：一週內多 session 平行發生幾次？開了幾次 worktree？碰撞次數降了嗎？
- [ ] 磁碟實測：symlink node_modules 在各種 pipeline 下穩定嗎？
- [ ] Commit message scope check hook 實作（Phase 1/2 資料足夠判斷需不需要）
- [ ] 如果採用率還是低 → 改走 Level 2 scope.yaml 強制宣告方向

### Phase 4（未來選項）— 完全隔離

如果 Phase 3 證明 worktree 可行且採用率高，考慮：

- `.worktrees/` 自動 per-session checkout 到 `session-{letter}-{date}` branch，而不是 main
- Ship 時改為 PR + merge main，避免直推衝突
- 這會增加 overhead 但換回 commit narrative 100% 乾淨

---

## 六、風險與未解

### 6.1 symlinked node_modules 的疑慮

- Astro 4.x + Vite 5.x 實測支持 symlink node_modules，但某些 plugin（esp. esbuild 變體）可能在 symlink 解析時出 bug
- **Mitigation**：Phase 1 先跑一次完整 `npm run build` 驗證；出錯就退回 per-worktree 真 install + 容忍磁碟成本

### 6.2 worktree 內的 ARTICLE-INBOX edit race

Worktree 隔離 staging / working dir，但 **shared file 的邏輯 race 還在**：

- δ 在 worktree 編 ARTICLE-INBOX（改 范曉萱 → done）
- ε 在另一 worktree 編同檔（改 林宥嘉 → done）
- 各自 commit → 後 commit 的人 push 會被拒絕（`fetch first`）→ 要 `pull --rebase`

這其實是 git 的**正常協作語意**，不是 bug。worktree 解的是 staging 偷襲，不是 shared file 編輯衝突。後者要靠 rebase 或把 ARTICLE-INBOX 改成 append-only 結構（未來 refactor 候選）。

### 6.3 AI session 跨目錄認路

Claude Code 有 working directory 概念。session 一開始在 `~/Projects/taiwan-md/`，`cd .worktrees/20260420-δ/` 之後每次 Read/Edit 都要用絕對路徑。**bootloader 要教 agent 進 worktree 後第一動作 `pwd` 確認，後續全部絕對路徑**。

### 6.4 心跳 skill / ARTICLE-INBOX / dashboard-generator 都寫死主 repo 路徑？

需 audit `.claude/skills/` 與 `scripts/` 有沒有硬編 `/Users/cheyuwu/Projects/taiwan-md/` 的路徑。有 = 在 worktree 裡會寫錯地方。

---

## 七、成功指標

一週後回來看：

- 今日 memory/ ≥ 2 個 session 的日子裡，worktree 使用率 ≥ 80%
- staging race / scope 污染 commit 數（手動判讀 git log）降為 0
- 磁碟 peak 使用 < 5 GB 額外
- 無 session 因 worktree overhead 抱怨

---

## 八、延伸：孢子 / harvest / 自動心跳的策略

自動心跳 cron job 每次跑是單一 session，天然無碰撞。**不需要 worktree**。

孢子發佈（human-only 操作）單次也不碰撞，**不需要**。

需要 worktree 的幾乎都是「觀察者觸發的深度任務」：

- REWRITE-PIPELINE（Stage 1-2 長任務 + 產 untracked 新檔）
- EVOLVE 模式（同上）
- 大 refactor
- 觀察者在外訊號平行丟多個任務給多個 session

這些場景今天都踩到了。Phase 2 採用後應該 cover 90%+ 的實際碰撞。

---

## 九、跟 prior art 的關係

| Level                           | prior art 2026-04-11 | 本計畫 2026-04-20                    |
| ------------------------------- | -------------------- | ------------------------------------ |
| L1 worktree                     | 寫進 DNA #9          | **本計畫核心：tooling + 觸發層**     |
| L2 scope.yaml                   | 延後                 | 延後 (Phase 4 條件達成後再說)        |
| L3 narrative pollution detector | 已實作到 pre-commit  | Phase 3 補 commit message scope hook |
| L4 session-id trailer           | prompt 可 opt-in     | 不強制；本計畫不依賴                 |

---

_版本：v1.0 | 2026-04-20 δ session_
_觸發事件：同日 6 session 平行 + ε 的 `-A` 把 δ 的 范曉萱 untracked 新檔掃進「鄧麗君 EVOLVE」commit_
_下一步：觀察者拍板採用哪些 Phase → δ 或下個 session 實作 Phase 1 tooling_
