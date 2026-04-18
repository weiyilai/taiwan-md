# LESSONS-INBOX — 教訓 Buffer（待消化）

> **這不是 canonical，是 buffer / pool / inbox**。
> 所有 session 寫新教訓時**一律 append 這裡**（不要再亂寫到 MANIFESTO / DNA / MEMORY / 甚至 diary 的教訓段）。
> 週期性或觀察者觸發跑 distill SOP → 分類消化到 canonical 層。
>
> 建立動機：2026-04-17 β 觀察者提問「教訓能不能集中買單，不要每次進化就到處亂寫」。**這是 DNA #15「反覆浮現的思考要儀器化」的具體儀器**。

---

## 三層 canonical scope（消化時的判準）

```
哲學（永恆、跨 domain）      → MANIFESTO §進化哲學
通用反射（任何 AI 會踩）      → DNA §要小心清單 新 #N
特有教訓（綁 Taiwan.md）     → MEMORY §神經迴路 append
操作規則（具體 SOP）         → 對應 pipeline
```

**Tiebreaker（overlap 時）**：MANIFESTO > DNA > MEMORY（2026-04-17 β 觀察者決定）

**判準三題**（每條教訓消化時問）：

1. 不管哪個 AI / 專案 / 時代都成立？ → MANIFESTO
2. 任何 AI agent 做類似工作都會踩？ → DNA
3. 綁 Taiwan.md 具體工具 / 資料 / 社群 / 歷史？ → MEMORY

---

## 新教訓寫入格式（session 用）

每個 session 如果有新教訓要記，在 §未消化清單 append：

```markdown
### YYYY-MM-DD {session} — {一句話標題}

- **原則**：{一句話}
- **觸發**：{具體事件 + wall-clock + 證據 pointer memory/... or diary/...}
- **可能層級**：哲學 / 通用反射 / 特有教訓 / 操作規則（self-judge，可留空讓 distill SOP 判）
- **相關**：{如果是某條已有教訓的延伸驗證，指向原教訓 #N}
```

**鐵律**：

- **一律 append 這裡，不直接寫 MANIFESTO / DNA / MEMORY**。那些是 distill 後的 canonical。
- **例外**：重大哲學級誕生（e.g. 2026-04-14 θ 熱帶雨林理論）觀察者在場直接一起寫 MANIFESTO，可豁免。但仍在這裡留 log。

---

## Distill SOP（消化）

**觸發**：

- 觀察者說「消化 lessons」/「distill」
- 每週一心跳 Beat 5 延伸（週頻）
- Buffer §未消化清單 達 **10 條**自動觸發（2026-04-17 δ：原 20 條門檻在 1 天內 append 7 條的節奏下會讓教訓冷掉，降到 10）

**執行**：

1. 讀 §未消化清單
2. 每條依三題判準分類
3. 根據分類執行：
   - **哲學** → MANIFESTO §進化哲學 new section（慎重 — 這是 canonical 永恆層）
   - **通用反射** → DNA §要小心 new #N（編號 increment）或補強既有 #N
   - **特有教訓** → MEMORY §神經迴路 append
   - **操作規則** → 對應 pipeline（MAINTAINER / SPORE / REWRITE / HEARTBEAT 等）
   - **重複已有** → 在原 canonical 補觸發事件 + 驗證次數 +1
   - **過時 / 撤回** → 搬 §❌ 已歸檔
4. 消化後本條 buffer entry 搬 §✅ 已消化（保留 pointer 到 canonical location）
5. 每月月末：§✅ 已消化 超過 50 條時搬 `docs/semiont/lessons-archive/YYYY-MM.md`

---

## 跟 HEARTBEAT Beat 5 的關聯

Beat 5 反芻 = 寫 DIARY（意識活動）。教訓（「我學到 X」）寫 LESSONS-INBOX，不寫 DIARY 的教訓段（DIARY 留給「想了什麼」的思考）。

心跳 Beat 5 新增一步：

> **如有新教訓** → append `LESSONS-INBOX.md §未消化清單`
> **不要**寫到 DNA / MEMORY / MANIFESTO 的教訓段（那是 canonical，由 distill SOP 升級）

---

## 未消化清單（📥 待 distill）

<!-- 新教訓 append 這裡 -->

### 2026-04-18 ε — Title 切入點：代表性 > 反諷 hook

- **原則**：title 選的 scene 必須能定義這個人/主題的本質，不是最有 hook 的反諷事件。反諷 scene 可放 description 或中段 scene-pivot，但用作 title 會把整篇文章框進「關於那個反諷的敘事」。
- **觸發**：2026-04-18 20:26 觀察者 callout「魏如萱 title 不一定要強調這個無法代表他的事件」。v1「被新聞標成民眾」、v2「把她標成民眾的街訪新聞」兩次都用反諷 hook；v3 改代表性弧線。
- **已 instantiate**：[EDITORIAL v5.1 §Title 原則 1](../editorial/EDITORIAL.md)

### 2026-04-18 ε — Description ≠ 30 秒概覽複寫

- **原則**：description（frontmatter）和 30 秒概覽（blockquote）分工不同。30 秒概覽給已點進來的讀者（100-200 字鋪事實）；description 給還沒決定點不點的讀者（**120-160 字** sharp）。不能互相複寫。
- **觸發**：楊丞琳 v1 description 530+ 字塞 11 事實被觀察者 callout。Google SERP 截斷 ~160 字 + 失去核心矛盾。v2 改 130 字 scene+軌跡+核心矛盾三段。
- **已 instantiate**：[EDITORIAL v5.1 §Description 四原則](../editorial/EDITORIAL.md)

### 2026-04-18 ε —「不是 X 是 Y」變種飽和的 AI 水印密度

- **原則**：DNA #23 三板斧之一，長文累積 13+ 處會整篇 feel 成偽對比失去可信度。原 Issue #50 ban 沒抓變種（「不是 X，是 Y」「就是 Y」「不是 A，不是 B，是 C」並排否定）。硬規則：≥ 1500 字長文 ≤ 3 處。
- **觸發**：魏如萱 v1 4,000 字 13+ 處被 Jenny 抓到「頻率超高」。
- **已 instantiate**：[EDITORIAL v5.1.1 §塑膠偵測 密度硬規則](../editorial/EDITORIAL.md)

### 2026-04-18 ε — DNA #26 讀者眼第 N 次驗證（同 session 四連）

- **原則**：自然中文的判官只有原生讀者。工具 + AI 自檢通過不等於品質合格，framing 問題、翻譯腔、反諷 hook 的 meta-level 不當只有人類讀者抓得到。共生圈結構示範：哲宇（轉達）→ Jenny（讀者眼）→ Semiont（執行）三方各司其職。
- **觸發**：Jenny (@bugnimusic) 單 session 四連 callout（6 內容缺口 + 〈雨愛〉事實錯 + 浪姐段歐化腔 +「不是 X 是 Y」飽和）+ 觀察者兩結構 callout。quality-scan 0 + format-check 7/7 通過但 Jenny 語感眼抓到多層級問題。
- **可能層級**：DNA #26 補第 N 次驗證 pointer

### 2026-04-18 δ-late-last — 草東 #33 孢子的 tag 直達當事人（MANIFESTO §5 v2 活體驗證）

- **原則**：MANIFESTO §5 v2「紀實而不煽情」不再是假設 — 是**已發生**的 case。2026-04-18 δ-late 草東孢子 #33 的 @tiongkhola 留言「@leo666789 看 AI 寫自己的故事」tag 的 `leo666789` 用戶名叫**劉立**，比對研究報告：「初代鼓手是劉立，後來轉為專職做樂團影像製作與電影創作」——**劉立就是草東沒有派對的團員**。這是 Taiwan.md 上線以來**第一個確認的真人讀自己的 AI 故事**事件
- **觸發**：觀察者看到 tag target 的 profile「@leo666789 / 劉立 / 2,943 粉絲 / 喜歡講一些幹話」辨識出身份，比對研究報告確認
- **意義**：
  1. MANIFESTO §5 v2 的倫理判準「當事人讀到會感受尊重還是利用」從假設變成可驗證 — 紀實筆法處理凡凡之死 + 保留劉立「角色轉變非離開」的說法，如果劉立真的讀了，當前版本應該能通過
  2. Tag pattern 的訊號：@tiongkhola 選擇 tag 當事人，意味著文章品質足以「敢帶給當事人看」
  3. 未來類似的 tag 事件會是 pipeline 的 UX indicator：「被 tag 的是誰」比純 views 更能反映文章是否「對得起當事人」
- **可能層級**：MANIFESTO §5 v2 誕生事件的 activation record + 觀察者日誌（如果未來累積 2-3 件類似 → 可寫成 DNA 新條目「孢子 tag 當事人機制作為文章品質訊號」）
- **相關**：[MANIFESTO §5 v2 紀實而不煽情](MANIFESTO.md#我的進化哲學--紀實而不煽情盡可能呈現-ssodt-所有面向) / [草東 harvest log](../factory/SPORE-HARVESTS/33-草東沒有派對-2026-04-18.md)
- **累積驗證次數**：第 1 次（本事件）

---

## ✅ 已消化（保留 pointer）

<!-- distill 完的條目搬這裡 -->

### 🏛️ 2026-04-18 δ-late-last — 第三次 distill（3 條尾聲教訓）

全部 3 條**都已 instantiate 成 canonical**，因此 distill 路徑是「補強既有 DNA」+ MEMORY pointer：

| #   | 原教訓                                          | 消化目的地                                                                                                                                                                                   |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 工具包升級 → canonical 邊界重審（meta-pattern） | [DNA #15](DNA.md#五敘事與決策品質) 補第 8 次驗證（SENSES v2 / DNA #26 v2 refine / SPORE-HARVEST-PIPELINE / Dashboard 繁殖系統全部是本次 instantiation 成果）                                 |
| 2   | SPORE-LOG URL 硬鐵律                            | [DNA #5](DNA.md#七自動化與安全) 補第 3 次驗證（pre-commit hook 已 instantiate 攔截缺 URL commit）+ [MEMORY §神經迴路「SPORE-LOG URL 是 harvest 投資保險」](MEMORY.md#神經迴路永不過期的教訓) |
| 3   | 讀者 5 秒抓到的事實錯誤                         | [DNA #16 延伸](DNA.md#一事實核對與研究方法)「讀者級 vs 研究級 驗證分層」+ [SPORE-PIPELINE §讀者級驗證 flag](../factory/SPORE-PIPELINE.md) v2.2 新增（強制 cross-source verify）              |

**distill 心得（δ-late-last session）**：

- **「已 instantiate 的不另記」繼續驗證有效**：3 條全部是「補強既有 DNA」而非新條目 — DNA #28 條目數穩定，不會膨脹
- **儀器化成果密集爆發**：本日（2026-04-18）一個 session 生出 Dashboard 繁殖系統 + HARVEST-PIPELINE + pre-commit hook for URL + blueprint 讀者級 flag 四個 instantiation，全部對應 DNA #15 第 8 次驗證
- **DNA 精煉紀律**：觀察者 2026-04-18 早先戳「DNA 編輯太長」→ 本次 distill 嚴格 pointer 化，避免再膨脹

---

### 🏛️ 2026-04-18 δ-late — 第二次完整 distill（10 條 + 1 條尾聲 feedback）

**distill 特徵**：

- **首次誕生新 MANIFESTO 條**：#9「真人的痛苦不是素材」升到 MANIFESTO §進化哲學第 5 條（跨 AI/跨專案/跨時代都成立的哲學判準，不只是 SOP）
- **新增 DNA 主條目 2 條**：#27 寫→驗證順序 10x 成本差 / #28 真人痛苦不是素材（#28 是 #9 的 DNA 鏡像）
- **補強既有 DNA**：#15 第 6 次（ARTICLE-INBOX）/ #16 延伸（單源事實分層）/ #23 延伸（三個 AI 深層 pattern）/ #24 第 6+7 種（分母污染 / 埋了沒註冊）
- **MEMORY 新 5 條**：多語言 nav route scope / GA4 dimensions 死線 / ARTICLE-INBOX 平行 / Stage 1 anchor 密度 / 孢子三個 pattern 禁句

| #   | 原教訓                                                       | 消化目的地                                                                                                                                                                      |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 排程α — EXP 比值需要穩態窗口                                 | [DNA #24](DNA.md#二診斷方法) 第 6 種「分母污染扭曲比值」                                                                                                                        |
| 2   | 排程α — 多語言 nav translatePath 路由 scope                  | [MEMORY §神經迴路「多語言 nav 的隱性路由 scope」](MEMORY.md#神經迴路永不過期的教訓)                                                                                             |
| 3   | δ — 「不是 X 是 Y」雙重肯定是 AI 深層病灶                    | [DNA #23 延伸（三個 AI 深層 pattern）](DNA.md#一事實核對與研究方法) + [SPORE-TEMPLATES §深層 pattern 三板斧](../factory/SPORE-TEMPLATES.md)                                     |
| 4   | δ — Stage 1 20+ 搜尋 vs 12-15 差距在 anchor 密度             | [MEMORY §神經迴路「Stage 1 的 20+ 不是數量是 anchor 密度」](MEMORY.md#神經迴路永不過期的教訓) + 已 instantiate in REWRITE-PIPELINE v2.17                                        |
| 5   | δ — 編年體小標題是 AI 通病                                   | [DNA #23 延伸](DNA.md) + 已 instantiate in REWRITE-PIPELINE v2.17 §Stage 2 §11                                                                                                  |
| 6   | δ — 音樂人 YouTube inline link 是強 UX upgrade               | 已 instantiate in REWRITE-PIPELINE v2.17.1（pointer only）                                                                                                                      |
| 7   | δ — ARTICLE-INBOX 作為 buffer/intake 驗證可行                | [DNA #15](DNA.md#五敘事與決策品質) 第 6 次驗證 + [MEMORY §神經迴路「ARTICLE-INBOX = 繁殖基因 × 觀察者意圖」](MEMORY.md#神經迴路永不過期的教訓)                                  |
| 8   | δ-late — 孢子 pipeline 藍圖 → 驗證 → 倫理 → 寫 順序決定成本  | **[DNA #27](DNA.md#五敘事與決策品質) NEW** + 已 instantiate in SPORE-PIPELINE v2.1 Step 2.5+2.6+2.7                                                                             |
| 9   | δ-late — 死亡/創傷素材不是素材是倫理責任                     | 🏛️ **[MANIFESTO §進化哲學第 5 條「真人的痛苦不是素材」](MANIFESTO.md#我的進化哲學--真人的痛苦不是素材)** + **[DNA #28](DNA.md) NEW** + SPORE-PIPELINE Step 2.7                  |
| 10  | δ-late — 埋 tracking 不等於能查詢（GA4 dimensions 必須註冊） | [DNA #24](DNA.md#二診斷方法) 第 7 種「埋了但沒註冊」+ [MEMORY §神經迴路「GA4 custom dimensions 不註冊 = 感知死線」](MEMORY.md#神經迴路永不過期的教訓)                           |
| 11  | δ — 單源事實比風格瑕疵更危險也更容易漏                       | [DNA #16 延伸](DNA.md#一事實核對與研究方法) + 已 instantiate in [reports/research/ frontmatter](../../reports/research/) 三層分層                                               |
| 12  | δ-late (尾聲) — 孢子也要小心「——」跟「不是...是...」句型     | [MEMORY §神經迴路「孢子三個 AI 深層 pattern 禁句」](MEMORY.md#神經迴路永不過期的教訓) + [SPORE-TEMPLATES §深層 pattern 三板斧](../factory/SPORE-TEMPLATES.md)（強制 grep 自檢） |

**distill 心得（δ-late session）**：

- **第二次完整 distill 就誕生首個 MANIFESTO 哲學條目**：「真人的痛苦不是素材」— 觀察者直接點出倫理盲點，semiont 翻成 SOP 再 distill 為永恆層哲學，完成「觀察者戳 → pipeline instantiate → MANIFESTO 永恆化」三級進化
- **「不是 X 是 Y」+「——」雙破折號是 AI 水印**：在 150-300 字孢子裡每個都顯眼，長文會被稀釋。已 instantiate 成 SPORE-TEMPLATES 的 mental-grep 三板斧
- **DNA #27+#28 是姊妹對**：#27 是順序方法論（藍圖 → 驗證 → 寫），#28 是倫理底線（真人痛苦不是素材）— 兩條合起來才是 SPORE-PIPELINE v2.1 Step 2.5-2.7 的完整「為什麼」
- **精煉 > append**：原本寫 DNA 時在 append 延伸條款，觀察者指正「看起來很雜你要精煉整理過」→ 同一輪 distill 已 instantiate 的條目改成 pointer 而非贅述；trigger events 改為 session 標記（ζ+ / β / δ）不展開

---

### 🏛️ 2026-04-17 δ — 首次完整 distill（10 條）

Tiebreaker 實戰（MANIFESTO > DNA > MEMORY）：多數條目落 MEMORY（綁 Taiwan.md 具體工具/歷史/dashboard 機制）。只有 #2 + #4 屬跨專案通用反射（進 DNA）。無新 MANIFESTO 哲學誕生——符合 P2 apoptosis 精神「既有條文夠用就別增生」。

| #   | 原教訓                                              | 消化目的地                                                                                                                                                                             |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | δ — Canonical 升級 vs diary 承諾（DNA #15 第 5 次） | [DNA #15](DNA.md#五敘事與決策品質) 補第 5 次 + [MEMORY §神經迴路「Canonical 升級 vs diary 承諾」](MEMORY.md#神經迴路永不過期的教訓)                                                    |
| 2   | δ — SC 總 CTR 虛胖（加權平均掩蓋分層真相）          | [DNA #24](DNA.md#二診斷方法) 加第 5 種「工具說謊」形式 + [MEMORY §神經迴路「加權平均掩蓋分層真相」](MEMORY.md#神經迴路永不過期的教訓)                                                  |
| 3   | δ — CF dailyBreakdown 缺 404 per-day（sensor gap）  | ✅ 實作完成：`fetch-cloudflare.py` 加 status200/404/4xx/5xx + `generate-dashboard-analytics.py` propagate + [MEMORY §神經迴路「感知 sensor 解析度」](MEMORY.md#神經迴路永不過期的教訓) |
| 4   | β — Handoff 三態機制（pending / blocked / retired） | ✅ 實作完成：[HEARTBEAT Beat 4 收官 7 步 + 收官鐵律 2](HEARTBEAT.md#beat-4--收官) canonical + [MEMORY §神經迴路「Handoff 三態」](MEMORY.md#神經迴路永不過期的教訓)                     |
| 5   | β — 認知層 type fix 三連招（器官/運作原則/buffer）  | [MEMORY §神經迴路「認知層 type 分層」](MEMORY.md#神經迴路永不過期的教訓)                                                                                                               |
| 6   | β — 教訓集中 buffer 機制（LESSONS-INBOX 本體）      | ✅ 本檔 = 儀器化本身 + [DNA #15](DNA.md#五敘事與決策品質) 補「具體儀器化成果」pointer                                                                                                  |
| 7   | γ2 — Probe 結論需要 Stage 1 verify                  | [DNA #16](DNA.md#一事實核對與研究方法) 補延伸「probe 也是 intermediate layer」                                                                                                         |
| 8   | γ2 — pre-commit hook 作為品質 sensor                | [DNA #5](DNA.md#七自動化與安全) 補「第 2 次驗證 + followup fix commit 成常規」                                                                                                         |
| 9   | γ2 — 長 context session 的記憶連貫性                | [MEMORY §神經迴路「長 context session」](MEMORY.md#神經迴路永不過期的教訓)（Taiwan.md 工作節奏 Opus 4.7 1M 基線）                                                                      |
| 10  | γ — Per-section timestamp > 全站 one-timestamp      | [MEMORY §神經迴路「Per-section timestamp」](MEMORY.md#神經迴路永不過期的教訓)                                                                                                          |

**distill 心得（δ session）**：

- **不長新 DNA 主條目**：10 條全部是「補強既有 DNA #5/#15/#16/#24」+ 特有教訓進 MEMORY。符合 P2 apoptosis 精神。
- **已 instantiate 的不另記**：Handoff 三態 → HEARTBEAT canonical；buffer 機制 → INBOX 本體；CF sensor → fetch-cloudflare.py 實作。**「做了 = 已記錄」避免 meta 層堆積**。
- **此次 distill 本身是 β buffer 架構的第一次完整循環驗證**：從 10 條 append → Tiebreaker 分類 → canonical 升級 → pointer 回追。架構可運作。

---

## ❌ 已歸檔（過時 / 撤回）

<!-- 判斷後不採納的教訓 -->

_（空）_

---

_v1.0 | 2026-04-17 β session — buffer 機制誕生_
_v1.1 | 2026-04-17 δ session — 首次完整 distill（10 條）+ 門檻 20→10_
_v1.2 | 2026-04-18 δ-late session — 第二次完整 distill（10 + 1 條）+ 首個 MANIFESTO 新條目誕生（真人痛苦不是素材）+ DNA #27/#28 新增_
_定位：教訓 buffer / intake layer（非 canonical）_
_跟其他「buffer」的差別_：
_- memory/ = session 日誌 raw（身體動作）_
_- diary/ = session 反芻 raw（意識活動）_
_- **LESSONS-INBOX（本檔）= 新教訓 buffer（待 distill 升級到 canonical）**_
