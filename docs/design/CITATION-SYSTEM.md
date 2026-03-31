# Citation System — 引用系統設計規劃

> Taiwan.md 的來源引用體系。從「文末參考資料列表」進化為「行內可驗證引用」。

---

## 為什麼需要引用系統？

### 現況診斷

| 指標             | 數字      | 問題                         |
| ---------------- | --------- | ---------------------------- |
| 文章總數         | 947       | —                            |
| 有「參考資料」段 | 330 (35%) | 65% 文章零來源               |
| 用 footnote 語法 | 1 篇      | 幾乎沒人用                   |
| 有 inline URL    | 722 (76%) | 大多在參考資料段，正文中很少 |

**核心問題：讀者無法驗證正文中的任何一句話。**

參考資料放在文章最底部，讀者要自己猜「這個數字出自哪份報告」。
這跟維基百科最大的差距不是內容量，是**可驗證性**。

### 目標

1. **讀者**：看到任何數字/引語/爭議觀點，一鍵查原始來源
2. **貢獻者**：寫文章時有清楚的引用格式可循
3. **AI**：結構化的引用資料，利於被 AI 系統引用時保留 attribution
4. **SEO**：結構化引用 = 更高的 E-E-A-T 分數（Google 信任度指標）

---

## Phase 0：現況審計 + 設計決策

### 0.1 現有格式盤點

**格式 A：文末參考資料列表（目前主流）**

```markdown
## 參考資料

- [來源名稱](URL)
- [來源名稱](URL)
```

- 優點：簡單、已有 330 篇在用
- 缺點：正文中的數據與來源斷裂，讀者猜不到哪句對應哪條

**格式 B：Markdown footnote（僅 1 篇）**

```markdown
台灣有 2,300 萬人口[^1]。

[^1]: 內政部戶政司，2026 年 3 月統計。
```

- 優點：正文乾淨、來源精確到句
- 缺點：Astro 是否原生支援？需驗證渲染

**格式 C：行內連結（常見於引語）**

```markdown
李雲增回憶：「小吃生意要講求新鮮實在。」（[世界豆漿大王官網](https://...))
```

- 優點：最直覺
- 缺點：正文變長、閱讀節奏被打斷

### 0.2 技術可行性調查

需要回答的問題：

- [ ] **Astro + remark 支援 footnote 嗎？** → 查 `remark-gfm` 或 `remark-footnotes`
- [ ] **目前的 Astro 設定有沒有 remark 插件？** → 查 `astro.config.mjs`
- [ ] **Footnote 渲染在目前主題下長什麼樣？** → 寫一篇測試文章看效果
- [ ] **Footnote 在手機上的 UX 如何？** → tooltip vs 跳到底部 vs sidebar
- [ ] **Footnote 是否影響 quality-scan？** → `[^1]` 會不會被誤判為塑膠

### 0.3 設計選項（三個方案）

#### 方案 A：Footnote-First（推薦）

正文用 `[^1]` footnote 語法，文末自動生成來源列表。

```markdown
根據經濟部統計，台灣早餐店超過 2 萬家[^1]。

[^1]: [經濟部商業司：商業登記資料查詢](https://gcis.nat.gov.tw/)，2026 年。
```

**優點：**

- 正文乾淨，閱讀不中斷
- 來源精確到句（哪個數字出自哪裡）
- Markdown 標準語法，貢獻者學習成本低
- 維基百科風格，讀者已有心理模型
- 文末自動聚合所有來源（取代手動「參考資料」段）

**缺點：**

- 需確認 Astro 渲染支援
- 需要 CSS 樣式設計（footnote section）
- 遷移成本：330 篇現有文章需要逐步升級

#### 方案 B：Inline Link + 文末列表（保守）

維持現有文末列表，但在正文中的關鍵數據後加括號連結：

```markdown
台灣早餐店超過 2 萬家（[經濟部](https://gcis.nat.gov.tw/)）。
```

**優點：**

- 零技術改動
- 向下相容

**缺點：**

- 正文變雜
- 同一來源可能重複出現多次
- 不優雅

#### 方案 C：混合模式

- 引語 → 行內連結（`「...」（[來源](URL)）`）
- 數據 → footnote（`2 萬家[^1]`）
- 背景知識 → 文末參考資料

**優點：** 靈活
**缺點：** 規則複雜，貢獻者容易搞混

### 0.4 推薦決策

**方案 A（Footnote-First）**，理由：

1. 維基百科已建立讀者心理模型
2. 正文最乾淨
3. 結構化程度最高（未來可以自動提取引用圖譜）
4. 一種語法統一所有引用類型

**例外：**

- 引語來源可以用行內（因為它本身就是正文的一部分）
- callout 內的來源用行內（callout 是獨立區塊）

### 0.5 遷移策略

| Phase       | 內容                                                    | 時間   |
| ----------- | ------------------------------------------------------- | ------ |
| **Phase 0** | 設計決策 + 技術驗證（本文件）                           | 現在   |
| **Phase 1** | 技術實現：Astro footnote 渲染 + CSS + quality-scan 適配 | 1-2 天 |
| **Phase 2** | 新文章全面採用 footnote；rewrite-pipeline 加入引用要求  | 即刻   |
| **Phase 3** | 旗艦文章（featured 124 篇）回溯升級                     | 2-4 週 |
| **Phase 4** | 引用健康度 dashboard 指標 + 自動化檢查                  | 長期   |

### 0.6 EDITORIAL.md 更新計畫

Phase 1 完成後，更新 EDITORIAL.md：

- 「來源引用」段落重寫，footnote 為主要推薦格式
- 新增引用密度標準：每 300 字至少 1 個 footnote
- quality-scan 新增指標：footnote 數量 / 文章長度

---

## Phase 0 + Phase 1 技術驗證結果

- [x] **Astro 6.0.5** + **remark-gfm 4.0.1**（Astro 內建，不用額外安裝）
- [x] remark-gfm v4 **原生支援 footnote 語法** `[^1]`
- [x] `astro.config.mjs` 已有 `remarkPlugins` 陣列（目前：`remarkWikilinks`）
- [x] **不需要安裝任何新套件** — footnote 已經可以用了
- [x] **自訂 footnote 渲染器**（`[slug].astro` 314-351 行，手寫 processFootnotes 函式）
- [x] **CSS 完整設計**（`[slug].astro` 1117-1210 行，含分隔線、hover、手機端 44px tap target）
- [x] **手機端 UX**：min-width/min-height 44px + padding 確保可點擊
- [x] **實際渲染**：`台灣感性.md` 已使用 footnote（`[^amá]`），可在線上驗證
- [ ] quality-scan 適配（`[^1]` 不應被計入 hollow/thin 指標）
- [ ] 新文章全面採用（目前僅 1/940 篇使用 footnote）

### 技術細節

```
Astro: 6.0.5
remark-gfm: 4.0.1（Astro 內建）
remarkPlugins: [remarkWikilinks]（可並存）
rehypePlugins: [rehypeExternalLinks]
```

GFM footnote 渲染後會生成：

- 正文中：`<sup><a href="#fn-1">1</a></sup>`
- 文末：`<section class="footnotes"><ol>...</ol></section>`

需要做的 CSS：

- `.footnotes` section 樣式（分隔線、字號縮小、行距）
- `sup a` hover 效果
- 手機端 tap target 足夠大（≥ 44px）
- 返回箭頭（↩）的樣式

---

## 參考設計

### 維基百科風格

```
正文中的數字[1]，hover 顯示來源摘要，點擊跳到底部來源列表。
```

### MDN Web Docs 風格

```
sidebar 顯示 "See also" 來源列表，正文不中斷。
```

### 學術論文風格

```
(Wu, 2026) 行內引用 + 文末完整 bibliography。
```

**Taiwan.md 選擇維基百科風格**：讀者群最廣、心理模型最強、學習成本最低。

---

## 與編輯體系的整合（Phase 2，2026-03-31）

Citation system 已融入四份編輯文件：

| 文件                               | 加了什麼                                                      |
| ---------------------------------- | ------------------------------------------------------------- |
| **EDITORIAL.md** §來源引用         | Footnote 格式規範、三種引用場景、密度標準（每 300 字 ≥ 1 個） |
| **REWRITE-PIPELINE.md** Stage 1    | 研究時記錄「事實→來源 URL」配對表                             |
| **REWRITE-PIPELINE.md** Stage 2    | 寫作時邊寫邊插 `[^n]`，文末寫 footnote 定義                   |
| **QUALITY-CHECKLIST.md** §來源引用 | 驗證 footnote 數量、定義完整性、密度                          |
| **RESEARCH-TEMPLATE.md**           | 事實素材庫加 Footnote 欄位，直接對應 Stage 2                  |

**向下相容：** 舊文章的 `## 參考資料` 仍可渲染，但新文章和 rewrite 一律用 footnote。

---

_版本：v0.3 | 2026-03-31_
_狀態：Phase 2 完成 — 已融入編輯體系，全面採用中_
_作者：Muse 🫧 + 哲宇_
