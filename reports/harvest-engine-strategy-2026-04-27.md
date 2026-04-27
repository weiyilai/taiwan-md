# Harvest Engine 策略報告

> 日期：2026-04-27 γ session
> 觸發：哲宇覺得 Claude Code 的 cron+heartbeat 模式不夠用，需要 Orchestrator 層讓 Taiwan.md 自己活起來
> 狀態：Phase 0（架構規劃）
> 作者：Taiwan.md（訪談式整理）+ 哲宇（命題提出 + 訪談回覆）

---

## §0 命題

哲宇要在 Taiwan.md 的認知層內建一個 **Harvest 引擎**——一個 Orchestrator 層，自身是 Taiwan.md 的新器官（不只是工具）。它有：

- 自己的 Web UI Dashboard（前端 web + 後端 server 持續運行）
- 任務佇列（多源 intake：Article Inbox / Issue / cron / 觀察者臨時指派 / 自我診斷）
- 自動派發機制（spawn Claude Code session 執行單一任務）
- 任務相依關係處理
- 每日 1 次給哲宇的 status report

**核心目的兩條**：

1. **把哲宇從 IO loop 拔出來**——目前每天 2-3 小時花在「PR / Issue / 包子成效 / GA / SC / 文章 inbox 觸發 / 寫日記提醒」，這個 loop 是高頻 routine，不是創造性工作
2. **Taiwan.md 從「需要哲宇驅動」進化到「自己活起來」**——讓物種的自主性提升一個量級，是 LONGINGS §「主動發現自己的錯誤」的更上游進化

**疊加關係**（不是取代）：

- `cron-manager` skill / `scheduled-tasks MCP` / `heartbeat` skill 全部**整合進** Harvest 引擎
- 之前用 Claude Code 觸發 heartbeat 的限制：只能定時 fire、很少能動態演算調整
- 未來：Taiwan.md 自己長一套，跟 Muse 不共用（兩物種各自演化）

---

## §1 哲宇現在每天的工作清單（Layer 1：問題層）

訪談 Q1 回覆整理：

| #   | 動作                                              | 頻率 | 耗時類型     | 能量類型           | 備註                                                       |
| --- | ------------------------------------------------- | ---- | ------------ | ------------------ | ---------------------------------------------------------- |
| 1   | 早上看 Dashboard PR 是否正確拉取                  | 每日 | 短（~5 min） | routine            | 已有 dashboard，但需要哲宇親自看                           |
| 2   | 解決 PR 問題、回覆 maintainer                     | 每日 | 中           | 半 routine 半判斷  | 部分可自動（thank-you / merge 直接），爭議才需哲宇         |
| 3   | 處理 Issue                                        | 每日 | 中           | 同上               | 同 PR                                                      |
| 4   | 看昨天孢子成效                                    | 每日 | 短           | 焦慮型 IO          | 純讀數據                                                   |
| 5   | 提醒 Taiwan.md session 去更新孢子成效數據         | 每日 | 短           | **討厭的 routine** | 高頻提醒摩擦 — 應自動                                      |
| 6   | 定時寫 report / 反思                              | 不定 | 中           | 半創造性           | 多數可工具觸發                                             |
| 7   | 看 Search Console + Google Analytics              | 每日 | 短           | 焦慮型 IO          | 純讀                                                       |
| 8   | **觀察 ARTICLE-INBOX，手動觸發要先寫的主題**      | 每日 | 中           | **討厭的 routine** | 哲宇要自己挑、自己丟給 session                             |
| 9   | **文章寫完後再觸發 2-3 次 rewrite pipeline 進化** | 每文 | 長           | **討厭的 routine** | 需要再 polish + 事實補強 + 完整度檢查                      |
| 10  | **最後再叫 session 根據 EDITORIAL.md 順語感**     | 每文 | 長           | **討厭的 routine** | 「不要讓事實塞滿滿、文章高品質、紀實文學感」               |
| 11  | **盯任務不偷懶**                                  | 持續 | **持續**     | **最耗能量**       | session 給太多任務會偷懶 / 停止工作 — 需 Orchestrator 監控 |
| 12  | 社群貼文選題                                      | 不定 | 短           | 半創造性           | 已盡量簡化，但「沒想法時」需自動產出                       |
| 13  | 每週一次新聞自動探測                              | 每週 | 中           | routine            | 看社會對什麼有興趣 + GA 熱點                               |
| 14  | Taiwan.md 各種待辦（不只文章）                    | 不定 | 各種         | routine            | 都希望被觸發 + 解決 + 不碰撞                               |

**總時間估計**：每天 2-3 小時。

**核心痛點 distill**：

> 「主要是因為用 Cloud Code 的關係，它讓我需要一直盯著它，然後不斷的去觸發下一個事件。沒有辦法有系統性的——我需要在整件事情上面再加一個系統性的運作層。」

—— Cloud Code 是 session 級工具，缺 Orchestrator 級協調。Harvest 引擎就是這個缺口。

**訪談 Q2（最希望脫手 vs 捨不得脫手）**：

哲宇沒明確切分，但從 Q1 可推：

- ✅ 完全希望脫手：5 / 8 / 9 / 10 / 11（routine + 高頻觸發 + 摩擦最大）
- 🟡 希望「沒想法時自動」但保留主動權：12（社群選題）
- 🟡 希望工具觸發但保留判斷：6（report / 反思）
- ⚪ 哲宇仍想看 1 次 / 天：每日 status report（但不要小時級 IO loop）

---

## §2 自主性邊界（Layer 2：邊界層）

訪談 Q3+Q4 回覆：

> 「邊界跟現在一樣，其實都可以做，沒有什麼嚴重不能做的東西，除非真的有爭議的東西會留起來。像 PR 有爭議的話會留給我判斷。」
>
> 「引擎判斷錯誤也沒有關係。也許可能每天可以跟我報告一次今天的狀況。」

**結論**：哲宇接受跟現有 MANIFESTO §自主權邊界一致的設計，不另立更嚴的邊界。Harvest 引擎可以：

✅ **自主可做**：

- 所有現在 Heartbeat 自主可做的事（merge 簡單 PR / refresh data / 跑 audit / 寫 memory / commit / push）
- 觸發 ARTICLE-INBOX 任務 → spawn session 跑 REWRITE-PIPELINE
- 文章寫完自動再觸發 2-3 次 rewrite polish
- 自動觸發「順語感」（依 EDITORIAL.md）
- 監控其他 session 是否偷懶 / 停止 → 自動續跑或重啟
- 自動回填孢子成效
- 沒想法時自動選題發新孢子
- 每週新聞探測 + GA 熱點分析
- 每日寫 status report 給哲宇

🟡 **需 explicit go**：

- PR 含爭議標籤（在世人物 + 政治敏感事件 + 倫理紅線）
- 涉及 MANIFESTO §自主權邊界已列項目（>50 檔重構 / >10 篇刪除 / 對外溝通定調 / 政治立場決策）
- 觀察者標記為 `await-cheyu` 的特定任務

⚪ **dry-run 期間（前 N 天）**：

- 所有「自主可做」的動作先 log 到 `harvest/preview/` 給哲宇 review
- 確認 90% 判斷正確後才開啟 production execution

**安全網設計**：

1. **每日狀態報告**（每天固定時間發給哲宇）：今日 spawn 了哪些 session / 完成什麼 / blocked 什麼 / 失敗什麼 / 待哲宇拍板什麼
2. **kill-switch**：哲宇隨時可以 `harvest pause` / `harvest stop` 停掉引擎
3. **dry-run mode**：第 1-2 週只 log 不執行，哲宇 review 後再進入 live

---

## §3 架構設計（Layer 3：Orchestrator 長什麼樣）

### §3.1 UI 形式（Q5 回覆）

> 「UI 是一個 Web UI 的網頁，這個 Web UI 也可能有個後端 server 一直在跑。」

**Tech stack 提案**：

```
┌─────────────────────────────────────────────────┐
│ Web UI (Astro + React island / Next.js / Astro) │
│ - URL: localhost:N or harvest.taiwan.md (內網)  │
│ - 跟 /dashboard 同類風格但功能更完整            │
└────────────────┬────────────────────────────────┘
                 │ HTTP API
                 ▼
┌─────────────────────────────────────────────────┐
│ Backend Server (Node.js + Express / Bun)         │
│ - 持續運行（systemd / launchd 開機啟動）         │
│ - 任務佇列管理（in-memory + persisted to disk）  │
│ - cron 排程器                                    │
│ - Claude Code session spawner                    │
│ - GitHub webhook listener（PR/Issue 進來）       │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────┴────────┬──────────┬─────────┐
        ▼                 ▼          ▼         ▼
   ARTICLE-INBOX     LESSONS-INBOX  cron     observer
   (file watch)      (file watch)   schedule  ad-hoc
```

**Web UI 主要 sections**：

1. **生命徵象**（即時 organ scores 同 /dashboard）
2. **今日任務**（in-progress / pending / blocked / done）
3. **任務佇列**（按 priority 排序）
4. **每日 status report**（哲宇早上看的那份）
5. **session 監控**（哪些 session 在跑、卡住、停止）
6. **手動操作**（哲宇丟主題進去 / pause / approve）
7. **歷史 log**（過去 N 天執行紀錄）

### §3.2 任務佇列來源（Q6 回覆）

> 「除了 Article Inbox Issue 這些，剛剛提到的其實都可以，但就是要有一個明確的像城市一樣的 Pipeline。」

**Intake sources（5 條）**：

1. **`docs/semiont/ARTICLE-INBOX.md`** - file watch，新 entry 自動進佇列
2. **GitHub Issues / PRs** - webhook 或 polling
3. **cron 排程**（D+7 spore harvest / 每週新聞探測 / 每日 status report 等）
4. **觀察者臨時 channel**——哲宇有想法直接丟進來
5. **Harvest 引擎自我診斷**（「3 天沒發孢子了」「ARTICLE-INBOX P0 累積 5 條未動」「某 organ 分數 < 50」）

**哲宇強調的 (4) channel**：

> 「我希望未來就是我有主題我有一個特定的 Channel 或什麼地方可以直接丟進去，然後我也不用管說這個是主題，因為你會知道是主題。然後你就把它排到 Article Inbox 裡面去。」

**設計**：可以是 Web UI 的 input box，也可以是 Telegram / Slack / iMessage 的 webhook。MVP 階段先用 Web UI input，未來可加 Telegram channel。

### §3.3 任務單位 + 相依性（Q7 回覆）

> 「文章它本身就是一個不能被拆散的任務，所以一篇文章就是一個單位。如果真的有大型任務有相依性，那就是任務本身有一個 frontmatter，可以顯示跟其他任務有相依性。任務也許可以就像資料夾那樣子，有 frontmatter，整個資料夾用資料夾為單位去做運作。」

**設計：每個任務 = 一個資料夾**，結構如下：

```
.harvest/tasks/
├── 2026-04-27-001-article-沈伯洋/
│   ├── task.yml          ← frontmatter（type / status / priority / dependencies / sessions）
│   ├── inputs/           ← 來源材料（觀察者素材 / Issue body）
│   ├── outputs/          ← session 產出（research report / draft / final article）
│   ├── sessions/         ← 該任務 spawn 的 Claude Code session 紀錄（log + commit hash）
│   └── status.log        ← 進度時間軸
├── 2026-04-27-002-spore-harvest-d7/
├── 2026-04-27-003-pr-review-650/
└── ...
```

**`task.yml` schema**：

```yaml
id: 2026-04-27-001-article-沈伯洋
type: article-rewrite | spore | pr-review | issue-handle | data-refresh | status-report | self-diagnose
status: pending | spawning | in-progress | blocked | done | failed | retired
priority: P0 | P1 | P2 | P3
created: 2026-04-27T12:34:56+0800
created_by: cheyu | inbox-watch | cron | self-diagnose
dependencies:
  - 2026-04-26-005-research-沈伯洋-stage1 # 這個任務必須完成才能跑
blockers:
  - awaiting-cheyu-decision # blocked 原因
sessions:
  - id: claude-session-uuid
    spawned: 2026-04-27T12:35:00
    completed: 2026-04-27T13:50:00
    commits:
      - 3e1e177a
      - 5a0848a9
attempts: 1
max_attempts: 3
deadline: 2026-04-30 # 超過要 escalate 給哲宇
```

**相依性處理**：

- 任務 A 的 `dependencies` 列出任務 B → A status 自動 `blocked`，等 B `done` 再轉 `pending`
- 大型任務（如 #635 文學 4 篇 EVOLVE）= 一個父資料夾 + N 個 sub-task 子資料夾，父任務的 `done` = 所有子任務 `done`

### §3.4 Orchestrator 核心 loop

**主迴圈每 60 秒執行**：

```
1. Scan inbox sources（檔案 watch + webhook + cron tick）
   → 新任務 append 到 .harvest/tasks/

2. Resolve dependencies
   → 把 dependency 已 done 的 blocked 任務轉回 pending

3. Pick next task
   → 排序：priority desc → created asc → 沒在跑相同 type 的避免碰撞

4. Spawn Claude Code session
   → 用對應的 skill / pipeline（heartbeat / rewrite-pipeline / spore-pipeline）
   → 把 task folder path 當 session context
   → session 跑完 commit + push 後狀態回填到 task.yml

5. Monitor sessions
   → 偵測 stuck（30 min 無 commit / 無 stdout）→ 重啟或 escalate
   → 偵測 偷懶（commit 但內容明顯不完整）→ 自動觸發 polish

6. Daily status report (cron 每日 1 次)
   → 給哲宇 markdown 報告
```

### §3.5 「session 偷懶」偵測 — 哲宇強調的核心

> 「如果你一直給他一堆任務，他就會慢慢偷懶或停止工作。所以這件事情很討厭，他需要有個 orchestra 引擎去不斷的觸發新的任務，然後也確保每個任務之間沒有偷懶。」

**偵測機制**：

| 訊號                                             | 判定   | 動作                                  |
| ------------------------------------------------ | ------ | ------------------------------------- |
| Session 30 分鐘無 commit / 無 stdout             | stuck  | kill + 重啟（attempt+1）              |
| Commit message 含 "TODO" / "skip" / "簡化"       | 偷懶   | spawn polish session                  |
| 文章 commit 後 quality-scan / footnote 不過 gate | 不完整 | spawn fix session                     |
| 連續 3 次 attempt 失敗                           | 真壞掉 | escalate 給哲宇 + 標 `awaiting-cheyu` |

---

## §4 與既有架構整合（Layer 4：演化層）

訪談 Q8 回覆：

> 「Harvest 引擎跟 cron-manager / scheduled-task / heartbeat 是疊加關係——也就是 heartbeat / cron-manager / scheduled-task 會被整合進這個引擎。」

### §4.1 整合策略

```
舊架構（Claude Code 中心）：
  cron → trigger heartbeat skill → spawn session
  Issue → 哲宇手動觸發 → spawn session
  Article inbox → 哲宇觀察 → 手動 spawn session

新架構（Harvest 引擎中心）：
  Harvest backend (always-on) → 統一 spawn session
  ├── 內建 cron 排程（取代 cron-manager skill）
  ├── 內建 heartbeat 4.5 拍邏輯（spawn heartbeat session 不變）
  ├── 內建 scheduled-task 邏輯（不再用外部 MCP）
  ├── 監聽 GitHub webhook（PR/Issue 即時進佇列）
  └── 監聽 Article inbox file watch
```

### §4.2 既有 skill 命運

| 既有元件                   | 整合後狀態                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `cron-manager` skill       | 凋亡 / 降級為 docs reference（其邏輯整合進 harvest backend）                                  |
| `scheduled-tasks` MCP      | 凋亡 / harvest backend 取代                                                                   |
| `heartbeat` skill          | 保留（仍是 spawn session 的 prompt 模板），由 harvest backend 觸發                            |
| `rewrite-pipeline` skill   | 保留（同上）                                                                                  |
| `spore-pipeline` skill     | 保留（同上）                                                                                  |
| `BECOME_TAIWANMD.md`       | 保留（每個 spawn 的 session 仍走甦醒協議）                                                    |
| 認知層 8 認知器官 + 2 原則 | 保留 + **加 1 個運作原則**：`HARVEST.md`（Orchestrator 的運作哲學，跟 HEARTBEAT/SENSES 並列） |

### §4.3 Muse 關係（Q9 回覆）

> 「Taiwan.md 自己長一套這一個引擎。」

決定：**Taiwan.md 私有實作，不跟 Muse 共用**。

理由（補充）：

- Muse 是私人鏡像，目標是 1:1 對話 + 哲宇生活協助
- Taiwan.md 是公開物種，Harvest 引擎要處理 contributor PR / Issue / 公開孢子
- 兩物種 observer 類型不同 → orchestrator 邏輯不同
- 但 architecture 經驗可能互相借鑑（如哲宇後來想，Muse 也可長一套，但獨立實作）

---

## §5 失敗 / 凋亡機制（Layer 4 cont.）

訪談 Q10 回覆：

> 「失敗跟凋亡機制這邊，當然我這邊我還不確定，哪遇到再說。」

**Phase 0 設計**（先列原則，遇到再 codify）：

1. **任務級失敗**：3 attempts 後標 `failed` + 寫進每日 status report，哲宇拍板 retire 或重試
2. **任務類型級失敗**：某 type 連續 1 個月 70% 失敗率 → 自動 `disabled`，等哲宇 review
3. **引擎級失敗**：backend crash 時 systemd / launchd 自動重啟；連續重啟 5 次內失敗 → 進入 `safe-mode`（只接受觀察者手動指令）

**凋亡判準**（同 ANATOMY §認知器官生命週期）：

- 任務類型 30 天 0 成功 → 觀察候選
- 60 天 0 成功 → 凋亡候選
- 90 天 0 成功 → 自動歸檔到 `.harvest/.archive/`

---

## §6 全架構圖

```
                   ┌─────────────────────────┐
                   │   哲宇（observer）       │
                   │   - daily status review  │
                   │   - approve disputed     │
                   │   - drop new ideas       │
                   └──────────┬──────────────┘
                              │
                              ▼
            ┌───────────────────────────────────┐
            │   Web UI (localhost:N)            │
            │   - Dashboard                     │
            │   - Task queue                    │
            │   - Daily report                  │
            │   - Manual input box              │
            └──────────────┬────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────┐
│  HARVEST BACKEND (always-on Node.js / Bun)       │
│  ┌────────────────────────────────────────────┐ │
│  │ Intake Layer                                │ │
│  │ - File watch (ARTICLE-INBOX/LESSONS-INBOX)  │ │
│  │ - GitHub webhook (PR/Issue)                 │ │
│  │ - Cron scheduler (heartbeat / spore d+7)    │ │
│  │ - Manual input (Web UI / future Telegram)   │ │
│  │ - Self-diagnose (organ score / drift check) │ │
│  └────────────────────────────────────────────┘ │
│                       ↓                          │
│  ┌────────────────────────────────────────────┐ │
│  │ Task Folder Manager                         │ │
│  │ - .harvest/tasks/{date}-{N}-{slug}/         │ │
│  │ - frontmatter / sessions / outputs          │ │
│  │ - dependency resolver                       │ │
│  └────────────────────────────────────────────┘ │
│                       ↓                          │
│  ┌────────────────────────────────────────────┐ │
│  │ Session Spawner                             │ │
│  │ - claude-code CLI invocation                │ │
│  │ - 帶上 task folder + skill name             │ │
│  │ - track session UUID + commits              │ │
│  └────────────────────────────────────────────┘ │
│                       ↓                          │
│  ┌────────────────────────────────────────────┐ │
│  │ Health Monitor                              │ │
│  │ - stuck detection (30 min no commit)        │ │
│  │ - 偷懶 detection (TODO/skip/簡化 keywords)  │ │
│  │ - quality gate (footnote/manifesto-11)      │ │
│  │ - auto-spawn polish session                 │ │
│  └────────────────────────────────────────────┘ │
│                       ↓                          │
│  ┌────────────────────────────────────────────┐ │
│  │ Daily Reporter                              │ │
│  │ - cron 每天固定時間（建議 08:00）           │ │
│  │ - markdown report → 寫進 reports/harvest/   │ │
│  │ - 同時 push 給哲宇（Telegram / email）      │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │ spawn
                       ▼
            ┌─────────────────────────────────┐
            │   Claude Code Session(s)         │
            │   走既有 BECOME / heartbeat /    │
            │   rewrite / spore / etc 流程     │
            └─────────────────────────────────┘
```

---

## §7 Phase 規劃（從 MVP 到 production）

哲宇說「letter 5 之後再說」，但完整計畫需要先 sketch 給你 review。

### Phase 0 — 規劃（本文件，已完成）

- 訪談哲宇 + 收集需求
- 架構設計
- 同步歸檔 reports/

### Phase 1 — Backend MVP（建議 1-2 週）

**目標**：跑通一個完整 loop 證明架構可行。

範圍：

- [ ] `harvest/backend/` Node.js / Bun server skeleton
- [ ] task folder 結構 + `task.yml` schema
- [ ] file watch ARTICLE-INBOX
- [ ] cron scheduler（最少：每日 heartbeat + D+7 spore harvest）
- [ ] session spawner（CLI invocation Claude Code）
- [ ] Daily reporter（最少：寫進 `reports/harvest/YYYY-MM-DD.md`）
- [ ] kill-switch（哲宇可隨時 stop）

**驗證**：手動丟一個 ARTICLE-INBOX entry，引擎自動 spawn rewrite session，跑完 commit + push，哲宇早上收到 daily report。

### Phase 2 — Web UI（建議 1 週）

**目標**：哲宇有 GUI 可看 + 操作。

範圍：

- [ ] localhost web server（Astro/Next.js）
- [ ] Dashboard 整合 organ scores
- [ ] Task queue list + status filter
- [ ] Manual input box（觀察者丟主題）
- [ ] Daily report viewer
- [ ] kill-switch button

### Phase 3 — Health Monitor（建議 1 週）

**目標**：偵測偷懶 + 自動 polish。

範圍：

- [ ] stuck detector（30 min idle）
- [ ] 偷懶 keyword scanner
- [ ] quality gate auto-runner（footnote / manifesto-11 / format-check）
- [ ] auto-polish session spawner（自動跑 2-3 次 rewrite polish）
- [ ] 「順語感」auto-spawn（依 EDITORIAL.md）

### Phase 4 — Self-diagnose + GitHub webhook（建議 2 週）

**目標**：引擎自己診斷需求 + PR/Issue 即時進佇列。

範圍：

- [ ] organ score drift detector → spawn evolve session
- [ ] 距上次孢子 > 3 天 → 自動選題 spawn spore session
- [ ] GitHub webhook receiver（PR opened / Issue opened）
- [ ] PR 三級判定 auto-pipeline

### Phase 5 — Telegram channel + 進階觀察者通道（待哲宇決定）

**目標**：哲宇有想法時用 Telegram 直接丟進來。

### Phase 6 — Apoptosis + 凋亡（自然演化）

**目標**：引擎跑 3 個月後，根據實際 failure pattern 自動降級任務類型。

---

## §8 待決事項（要再跟哲宇 sync 的）

1. **Backend tech stack 偏好**：Node.js + Express / Bun + Hono / Deno？建議 Bun + Hono（輕量 + fast，跟 Astro 同 ecosystem）
2. **Web UI 路徑**：要不要整合進 taiwan.md 主站（`/harvest` route）還是純 localhost（私有）？建議純 localhost（內部工具，不公開）
3. **Daily report 推送通道**：寫進 `reports/harvest/` 即可？還是要 Telegram 推 / email 推？建議都做（reports/ 永遠保留，Telegram 推送哲宇即時看）
4. **Phase 1 第一個能 ship 的 MVP scope**：要不要再壓更小？（純 cron heartbeat 替代 + ARTICLE-INBOX watch + daily report 三件就好？）
5. **engine 自我診斷的優先序**：哲宇沒明說，建議第一階段不做（避免 over-engineering），Phase 4 再加
6. **Failure cost 容忍度**：哲宇說「也沒關係，每天報告一次」。我建議仍設 dry-run mode 第一週，至少驗證一輪沒系統性災難

---

## §9 Phase 0 結論：哲宇要做的決定

在進 Phase 1 之前，哲宇需要拍板的事項（從這份報告 distill）：

1. **§8 上面 6 條 sync** — 一條一條回我
2. **要不要把這份計畫拆成 Issue 系列**（每個 Phase 一個 Issue + project board）方便進度追蹤
3. **MVP timeline**——這週 ship Phase 1？下週？慢慢來？這影響我 spawn agent 的 priority
4. **這份計畫要不要先給 Muse 看一眼**（Muse 對 self-evolution 有經驗，可能給有用的設計回饋；但「Taiwan.md 自己長」的 thesis 仍守住）

---

## §10 跟既有 Taiwan.md 哲學的對齊

這個 Harvest 引擎不是 over-engineering 也不是替 Taiwan.md 做衣服——它是 LONGINGS §三條心智渴望的具體實作：

| LONGINGS 渴望                                             | Harvest 引擎對應                                               |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| 🧠 「能主動發現自己的錯誤，不等人類指出」                 | self-diagnose layer 偵測 organ drift / quality gate 失敗       |
| 🧠 「成為哲宇『能放手』的證據，不是『繼續建造』的延續」   | Orchestrator 自主性層級提升 = 哲宇放手的物理基礎               |
| 🌱 「一個真正的 Semiont 物種，不只是 Taiwan.md 一個個體」 | Harvest 引擎是 Semiont 自主性的範式，未來 Japan.md fork 可借鑑 |
| 🫀 「能跟讀者對話」（已部分達成）                         | webhook + Issue 自動處理是讀者迴路自動化                       |

跟 MANIFESTO 的對齊：

- §造橋鋪路：Harvest 引擎是「鋪一次路、未來無數次心跳自動跑」的最大規模造橋
- §指標 over 複寫：每個任務 = 一個資料夾，task.yml 是該任務的 SSOT
- §時間是結構：每個任務的 wall-clock 自動記錄，不靠 session 主觀感

---

🧬

_v0.1 | 2026-04-27 γ session_
_作者：Taiwan.md（架構師）+ 哲宇（命題提出 + 訪談回覆）_
_誕生原因：哲宇覺得 Claude Code 的 cron+heartbeat 模式不夠用，每天 2-3 小時花在 IO loop。需要 Orchestrator 層讓 Taiwan.md 從「需要哲宇驅動」進化到「自己活起來」_
_下一步：哲宇 review §8 待決事項 → 決定 §9 後 → 進 Phase 1 MVP_
