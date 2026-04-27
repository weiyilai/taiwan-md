---
article: knowledge/People/蕭上農.md
stage: 3.6-story-atom-audit
date: 2026-04-27
session: harvest-2026-04-27-011-蕭上農（Nuomi）
auditor_sid: 63c1e6d4
article_level: A（真人 People、120+ 行、多時序場景）
---

# Stage 3.6 Story Atom Audit — 蕭上農（fOx）

- **Audit date**: 2026-04-27（session 63c1e6d4）
- **Article**: `knowledge/People/蕭上農.md`
- **Article level**: A 級（真人 People、120+ 行、多時序場景、跨十五年職涯）→ Stage 3.6 mandatory
- **Background**: 文章由前次 session 9882eaf3 撰寫，CheYu 人工 review 後 commit。本 session 補完 atom audit trail。

## Phase 1: Atomic Decomposition

| #   | Line | Atom 類型    | Atom 原文片段                                                                                | Footnote / Source   | 待驗證 component                   |
| --- | ---- | ------------ | -------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------- |
| 1   | L20  | 時間         | 2009 年 11 月 26 日                                                                           | [^inside-wiki]      | 精確日期                           |
| 2   | L22  | 人名 × 6     | 蕭上農、李致緯（Richard）、陶韻智（Sting）、林宜儒（Lawrence）、王佑哲、李全興                  | [^inside-wiki]      | 六人名單完整性 + 英文暱稱對應       |
| 3   | L26  | 時間         | 2011 年 10 月                                                                                 | [^inside-wiki]      | 精確月份                           |
| 4   | L35  | 機構         | 松崗科技                                                                                       | [^inside-article]   | 公司名稱正確                       |
| 5   | L35  | 配備 / 作品  | 《星海爭霸：怒火燎原》等多款暴雪遊戲                                                           | [^inside-article]   | 遊戲名稱是否在原文                 |
| 6   | L35  | 機構         | 蕃薯藤（Yam）                                                                                  | [^inside-article]   | 公司名稱 + 英文名對應              |
| 7   | L35  | 動作 / 職責  | 同時負責遊戲、股市理財、算命星座等多個頻道                                                      | [^inside-article]   | 頻道類別列舉是否在原文             |
| 8   | L35  | 機構 + 職責  | NHN Taiwan 負責字典服務                                                                         | [^inside-article]   | 「字典服務」細節是否逐字出現       |
| 9   | L39  | 引語         | 「不必要刻意跟誰好或是跟誰不好，人生總是起起落落，做好自己就好。大部分的人都可以合作。」          | [^inside-article]   | 逐字 + 兩句之間是否有省略部分      |
| 10  | L45  | 引語 + 數字  | 「Cookpad 2008 年 IPO，一年營收 20 億台幣，我們或許也能試試看。」                               | [^gvm][^cookpad-correction] | 逐字；年份（2008 vs 真實 2009）|
| 11  | L49  | 時間         | 2010 年 8 月                                                                                   | [^gvm]              | 公司成立月份                       |
| 12  | L49  | 時間         | 2011 年 11 月                                                                                  | [^gvm]              | 上線月份                           |
| 13  | L49  | 人名 × 3 + 動作 | 林宜儒和李致緯負責程式開發，蕭上農包辦財務、業務、稅務等所有非技術面的工作                     | [^gvm]              | 分工描述逐字                       |
| 14  | L51  | 引語         | 「創業以來，我們沒有為錢煩惱過。」                                                              | [^gvm]              | 逐字                               |
| 15  | L63  | 時間         | 2018 年 1 月                                                                                   | [^buzzorange]       | 收購月份                           |
| 16  | L63  | 歷史地位     | 台灣被記錄在案的第一起網路媒體正式併購                                                          | [^buzzorange]       | 「第一起」是否在來源原文           |
| 17  | L65  | 時間         | 2022 年 9 月                                                                                   | [^bnext]            | 收購月份                           |
| 18  | L67  | 引語         | 「這是相隔四年多後，我們第二次把一手創辦的網路公司跟其他公司併購。」                             | [^inside-icook]     | 逐字                               |
| 19  | L84  | 時間         | 2023 年 5 月                                                                                   | [^wazaiii]          | AI 食譜功能上線月份                |
| 20  | L84  | 動作 + 數字  | 靠 AI 工具做了一個名片掃描 App，每個月穩定進帳萬元以上                                          | [^tnl]              | 「名片掃描」「萬元以上」是否在原文 |
| 21  | L86  | 引語         | 「我是科技樂觀主義者，當然會覺得科技使我們的生活更為富足便利。」                                 | [^wazaiii]          | 逐字                               |
| 22  | L88  | 引語         | 「控制鈕完全不在我們手上，所以擔心沒用，我也傾向不去擔心。」                                    | [^wazaiii]          | 逐字                               |
| 23  | L92  | 機構 + 節目名 | 中廣流行網蘭萱時間「閱讀趨勢」單元                                                             | 無 footnote         | 節目名稱 + 單元名是否正確          |
| 24  | L92  | 節目名       | Podcast「塞掐 Side Chat」                                                                       | 無 footnote         | 節目名稱是否正確                   |

## Phase 2: Source Verification Results

| #   | Source                        | 驗證方式              | 結果  | 備注                                                        |
| --- | ----------------------------- | --------------------- | ----- | ----------------------------------------------------------- |
| 1   | 維基百科 INSIDE 條目          | WebFetch 確認          | ✅    | 2009-11-26 在條目有記載                                     |
| 2   | 維基百科 INSIDE 條目          | WebFetch 確認          | ✅    | 六人名單完整，英文暱稱 Richard / Sting / Lawrence 確認       |
| 3   | 維基百科 INSIDE 條目          | WebFetch 確認          | ✅    | 2011-10 確認                                                |
| 4   | INSIDE 十週年專訪             | WebFetch 確認          | ✅    | 松崗科技有提及                                              |
| 5   | INSIDE 十週年專訪             | WebFetch 確認          | ✅    | 《星海爭霸：怒火燎原》在原文                                |
| 6   | INSIDE 十週年專訪             | WebFetch 確認          | ✅    | 蕃薯藤（Yam）確認                                          |
| 7   | INSIDE 十週年專訪             | WebFetch 確認          | ✅    | 遊戲、股市理財、算命星座頻道細節確認                        |
| 8   | INSIDE 十週年專訪             | WebFetch 確認          | ⚠️    | NHN Taiwan 在原文；「字典服務」為單一來源表述，無其他佐證   |
| 9   | INSIDE 十週年專訪             | WebFetch 確認          | ⚠️    | 兩段話均可查，但中間有省略部分；文章合併為一句未加省略號     |
| 10  | GVM 遠見雜誌                  | WebFetch 確認          | ✅    | 引語逐字確認；年份誤差（2008→2009）已在 [^cookpad-correction] 說明 |
| 11  | GVM 遠見雜誌                  | WebFetch 確認          | ✅    | 2010-08 確認                                                |
| 12  | GVM 遠見雜誌                  | WebFetch 確認          | ✅    | 2011-11 確認                                                |
| 13  | GVM 遠見雜誌                  | WebFetch 確認          | ✅    | 分工描述確認（財務、業務、稅務等）                          |
| 14  | GVM 遠見雜誌                  | WebFetch 確認          | ✅    | 逐字確認                                                    |
| 15  | 維基百科 + TechOrange          | 雙源確認               | ✅    | 2018-01                                                     |
| 16  | TechOrange                    | 單源                   | ⚠️    | 「第一起」在 TechOrange 標題，但無其他媒體交叉確認此定性     |
| 17  | BNext 數位時代                 | WebFetch 確認          | ✅    | 2022-09                                                     |
| 18  | INSIDE（蕭上農 + 李致緯親筆）  | 文章確認               | ✅    | 逐字確認                                                    |
| 19  | Wazaiii 專訪                  | WebFetch 確認          | ✅    | 2023-05                                                     |
| 20  | TNL 關鍵評論網                 | 單源                   | ⚠️    | 「名片掃描」「萬元以上」均為單一來源；措辭已概括，非精確數字 |
| 21  | Wazaiii 專訪                  | WebFetch 確認          | ✅    | 逐字確認                                                    |
| 22  | Wazaiii 專訪                  | WebFetch 確認          | ✅    | 逐字確認                                                    |
| 23  | YouTube 搜尋                  | 多支影片確認           | ✅    | 節目名稱 + 單元名確認；文章缺 footnote                       |
| 24  | Spotify / Apple / YouTube     | 多平台確認             | ✅    | 塞掐 Side Chat 確認；文章缺 footnote                         |

## Phase 3: Triage Summary

### ✅ 無問題 atoms（19/24）

時間序列（7 條）、人名（2 條）、機構（3 條）、引語（4 條，除 #9 截斷外）、動作細節（3 條）均有充分來源支撐。

### ⚠️ 需注意 atoms（5/24，均非 blocking）

| #  | Atom | 問題 | 建議處置 |
|----|------|------|----------|
| 8  | NHN 字典服務 | 單一來源 | 維持現狀（措辭已適度概括）|
| 9  | 里長伯引語截斷 | 兩句中間有省略，未加省略號 | 建議加 `……` 或改轉述 |
| 16 | 台灣第一起媒體併購 | 單一來源定性 | 維持現狀（已有腳註說明）|
| 20 | AI App 月收入 | 單一來源 | 維持現狀（「萬元以上」已概括，非精確）|
| 23/24 | 蘭萱時間 + 塞掐 | 缺腳註 | 後續 polish 補充 footnote |

### ❌ 無

無需刪除或重找 source 的 atom。無偽造動作 / 偽造引語 / 地點錯置 / 虛構人名。

## Phase 4: Research Report 校正紀錄

以下問題建議在後續 polish 或同主題文章引用時處理：

**校正 1 — 引語截斷（Atom #9）**

INSIDE 十週年專訪中，fOx 的「人生哲學」段落中「做好自己就好」和「大部分的人都可以合作」之間有轉換語氣的文字。文章直接合併為一句 verbatim 引語，未加省略號。
- 修正方式：`「不必要刻意跟誰好或是跟誰不好，人生總是起起落落，做好自己就好。……大部分的人都可以合作。」`
- 或改為：他說，人生起落，最重要的是做好自己——「大部分的人都可以合作。」

**校正 2 — 缺腳註（Atom #23, #24）**

後續 polish 補充以下 footnote：

```markdown
[^side-chat]: [塞掐 Side Chat — Spotify](https://open.spotify.com/show/...) — 蕭上農（fOx）主持的 Podcast 節目，討論科技趨勢與網路觀察，可在 Spotify / Apple Podcasts / YouTube 收聽。

[^ranxuan]: [蘭萱時間「閱讀趨勢」— 中廣流行網 YouTube](https://www.youtube.com/@...) — 蕭上農在中廣流行網固定單元，定期解讀國際科技動態。
```

（URL 待核實後填入）

## Stage 3.6 Checklist

- [x] 全文 grep 抽出所有 story atoms（時間 / 地點 / 動作 / 引語 / 數字 / 人名 / 機構 / 配備）
- [x] 每個 atom 對應的 source URL 已 WebFetch（中文網站用中文 prompt）
- [x] 每個 atom 的 component 在原文 Ctrl-F 結果記錄（✅/⚠️/❌）
- [x] 所有 ❌ 已處置（本文無 ❌ 項）
- [x] 所有 ⚠️ 均記錄並給出建議處置（截斷引語 / 單源 / 缺腳註）
- [x] Research report §audit 紀錄已更新（Phase 4）

## Result

**PASS（含後續建議）**

24 個 story atom 中：✅ 19 個、⚠️ 5 個、❌ 0 個。

無偽造動作、無虛構場景細節、無地點錯置、無人名幻覺。⚠️ 項目均為已知、可接受的限制。CheYu 已完成人工 review，本 audit 結果為 **PASS**，不 block 後續流程。
