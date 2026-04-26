#!/usr/bin/env bash
# check-manifesto-11.sh — MANIFESTO §11 + AI 文體三層檢查器（context-aware + 口語建議）
#
# Tier 1（HARD violations，預設 fail exit 1）：
#   [1-11] 「不是X是Y」對位句型全變體 + 破折號連用 + 破折號密度
#
# Tier 2（DENSITY warnings，同篇 ≥ 2 次 = AI 抽象 metaphor 偷懶 reach）：
#   [12] 重量/縮影/軌跡/DNA/基因/土壤/養分/血液/縫隙/肌理/織就/指紋/神經末梢/
#        肌肉記憶/基底/底色/張力/光譜/鏡子/弧線/承載著/形塑/鬆動/展演/召喚/凝視/
#        直面/直擊/鋪陳/醞釀/沈澱
#
# Tier 3（RITUAL warnings，≥ 1 次 = AI 句首 / 結尾儀式語）：
#   [13] 在這個意義上 / 不可或缺 / 並非偶然 / 不言而喻 / 不可言說 / 無以名狀 /
#        影響深遠 / 不可磨滅 / 觸動人心 / 振聾發聵 / 醍醐灌頂 / 歷久彌新 /
#        拭目以待 / 不容忽視 / 值得我們深思 / 值得期待 / 耐人尋味
#
# 預設行為：Tier 1 違反 → exit 1；Tier 2/3 警告 → 列出但 exit 0
# `--strict` 旗標：Tier 1/2/3 任一違反都 exit 1（適合 polish 階段嚴審）
#
# Context-aware 自動排除（不算違反）：
#   - frontmatter（首尾兩個 `---` 之間）
#   - footnote definitions（`[^N]: ...` 開頭的行 — 是來源描述，不是 author voice）
#   - code blocks（``` ... ``` 之間）
#   - 直接引語句子（「...」內的 metaphor 詞通常是引用他人原話）
#
# 觸發歷史：
#   2026-04-23 β：原 quality-scan 漏掉 11 種對位變體，從認知作戰實戰挖出
#   2026-04-26 β8：觀察者反饋「除了不是X是Y，AI 一直用『重量』『裸奔』」
#                  Audit 全 knowledge/ 後確認：軌跡 215 / DNA 191 / 直面 152 /
#                  縮影 120 / 重量 62 — endemic AI tropes
#                  升級成三層 gate + context-aware 排除 + 口語替代建議
#
# 用法：
#   scripts/tools/check-manifesto-11.sh knowledge/People/田馥甄.md
#   scripts/tools/check-manifesto-11.sh --strict knowledge/People/田馥甄.md
#   scripts/tools/check-manifesto-11.sh knowledge/**/*.md
#   echo "$SPORE_TEXT" | scripts/tools/check-manifesto-11.sh -
#   scripts/tools/check-manifesto-11.sh --text "不是A，而是B"

set -e

export LC_ALL="${LC_ALL:-en_US.UTF-8}"
export LANG="${LANG:-en_US.UTF-8}"

STRICT=0
if [[ "$1" == "--strict" ]]; then
  STRICT=1
  shift
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--strict] <file.md> [<file2.md> ...]"
  echo "       echo \"\$TEXT\" | $0 [--strict] -"
  echo "       $0 [--strict] --text \"<text>\""
  echo ""
  echo "  --strict: Tier 2 / 3 警告也算違反，exit 1"
  exit 2
fi

total_t1=0
total_t2=0
total_t3=0
files_with_violations=0

handle_inline_text() {
  local text="$1"
  local tmp
  tmp=$(mktemp -t manifesto-11-check.XXXXXX.md)
  printf '%s' "$text" > "$tmp"
  check_file "$tmp"
  rm -f "$tmp"
}

# ────────────────────────────────────────────────────────────────────
# Tier 2 AI 抽象 metaphor 詞 + 口語替代建議
# ────────────────────────────────────────────────────────────────────
TIER2_WORDS=(
  "重量" "縮影" "軌跡" "弧線" "DNA" "基因"
  "土壤" "養分" "血液" "縫隙" "皺褶" "肌理" "織就"
  "指紋" "神經末梢" "肌肉記憶" "基底" "底色"
  "張力" "光譜" "鏡子" "承載著" "形塑" "鬆動"
  "展演" "召喚" "凝視" "直面" "直擊"
  "鋪陳" "醞釀" "沈澱"
)

# 口語替代建議（case 語句 — 兼容 bash 3.2，避免 associative array）
suggest_tier2() {
  case "$1" in
    重量) echo "份量／影響／實在的價值（或寫具體：對誰的什麼造成什麼）" ;;
    縮影) echo "典型例子／像 X 一樣的事情（或直接點名相同模式）" ;;
    軌跡) echo "走的路／發展過程／一條路（or 直接寫『從 X 到 Y』）" ;;
    弧線) echo "變化／從 X 到 Y" ;;
    DNA|基因) echo "本質／特質／標誌（或具體說『X 的特點是 Y』）" ;;
    土壤) echo "環境／條件／背景" ;;
    養分) echo "來源／支撐／餵養 X 的東西" ;;
    血液) echo "傳承／來源／本來就在裡面的東西" ;;
    縫隙) echo "空間／機會／鑽進去的地方" ;;
    皺褶) echo "細節／層次" ;;
    肌理) echo "質感／結構" ;;
    織就) echo "形成／構成／編成" ;;
    指紋) echo "痕跡／特徵／記號" ;;
    神經末梢) echo "細節／敏感的地方" ;;
    肌肉記憶) echo "習慣／本能反應／不用想就會做" ;;
    基底|底色) echo "基本／底子／本來樣貌" ;;
    張力) echo "衝突／對立／矛盾／拉扯" ;;
    光譜) echo "範圍／各種可能" ;;
    鏡子) echo "反映／對照／照出 X 的樣子" ;;
    承載著) echo "帶著／含著／有" ;;
    形塑) echo "形成／塑造／影響" ;;
    鬆動) echo "動搖／改變／鬆掉" ;;
    展演) echo "表演／做出來／表現" ;;
    召喚) echo "喚起／引起／叫出來" ;;
    凝視) echo "看／注視／盯著" ;;
    直面) echo "面對／直接看／不躲" ;;
    直擊) echo "直接打到／衝擊" ;;
    鋪陳) echo "鋪開／講／一個一個說" ;;
    醞釀) echo "形成／累積／慢慢長出來" ;;
    沈澱) echo "留下／累積／剩下" ;;
    *) echo "" ;;
  esac
}

# ────────────────────────────────────────────────────────────────────
# Tier 3 AI 句首/結尾 ritual 語
# ────────────────────────────────────────────────────────────────────
TIER3_PHRASES=(
  "在這個意義上" "從某種意義上" "就此而言" "換言之"
  "值得我們深思" "值得我們反思" "拭目以待" "不容忽視"
  "不可或缺" "不可磨滅" "影響深遠" "歷久彌新"
  "並非偶然" "耐人尋味" "不言而喻" "不可言說" "無以名狀"
  "觸動人心" "引人深思" "入木三分" "振聾發聵" "醍醐灌頂"
)

suggest_tier3() {
  case "$1" in
    "在這個意義上"|"從某種意義上"|"就此而言"|"換言之") echo "考慮刪除整段或重寫；通常前後句可以直接接" ;;
    "值得我們深思"|"值得我們反思"|"拭目以待"|"值得期待") echo "罐頭結尾；用具體畫面 / 留問題替代" ;;
    "不容忽視"|"不可磨滅"|"影響深遠"|"歷久彌新") echo "空洞評價；用具體事實或場景替代" ;;
    "不可或缺") echo "通常空話；具體說『沒有 X 就沒有 Y』" ;;
    "並非偶然") echo "通常多餘；直接寫因果關係" ;;
    "耐人尋味"|"不言而喻"|"不可言說"|"無以名狀") echo "不要叫讀者去『品味』；直接把意思說出來" ;;
    "觸動人心"|"引人深思") echo "讓事實自己觸動／思考，不要替讀者下評語" ;;
    "入木三分"|"振聾發聵"|"醍醐灌頂") echo "成語浮誇；用具體場景 / 引語替代" ;;
    *) echo "考慮刪除或重寫" ;;
  esac
}

# ────────────────────────────────────────────────────────────────────
# Context-aware 預過濾：把 frontmatter / footnote def / code block / 直引
# 的內容變成空行（line numbers 保留 → 後續 grep -n 仍指向原檔行號）
# ────────────────────────────────────────────────────────────────────
preprocess_for_check() {
  local f="$1"
  awk '
    BEGIN { fm=0; in_code=0 }
    /^---$/ { fm++; print ""; next }
    fm < 2 { print ""; next }                       # frontmatter → blank
    /^```/ { in_code=!in_code; print ""; next }
    in_code { print ""; next }                       # code block → blank
    /^\[\^[0-9]+\]:/ { print ""; next }              # footnote def → blank
    {
      # 移除「...」內的內容（直引豁免，但保留外圍）
      gsub(/「[^」]*」/, "")
      print
    }
  ' "$f"
}

check_file() {
  local f="$1"
  local t1=0 t2=0 t3=0
  local output=""

  # 預過濾後寫入 tmp（line numbers 保留）
  local filtered
  filtered=$(mktemp -t mfst-filtered.XXXXXX.md)
  preprocess_for_check "$f" > "$filtered"

  # ════════════════════════════════════════════════════════════════════
  # TIER 1 — HARD VIOLATIONS（既有 11 條，§11 對位句型 + 破折號密度）
  # ════════════════════════════════════════════════════════════════════

  # 1. 經典對位
  local p1
  p1=$(grep -nE "不是[^，。\n]{1,50}(，|。)是|不是[^，。\n]{1,50}[^\n]{0,50}(而是|就是)" "$filtered" 2>/dev/null || true)
  if [[ -n "$p1" ]]; then
    output+="\n  [1] 不是X{，|。|而}是Y（對位句型）:\n$(echo "$p1" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p1" | wc -l | tr -d ' ')))
  fi

  # 2. 不只是/不只/不僅
  local p2
  p2=$(grep -nE "不只是|不只[^是\s，。]|不僅是|不僅[^\s，。]" "$filtered" 2>/dev/null || true)
  if [[ -n "$p2" ]]; then
    output+="\n  [2] 不只是/不只/不僅:\n$(echo "$p2" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p2" | wc -l | tr -d ' ')))
  fi

  # 3. 這不是
  local p3
  p3=$(grep -nE "這不是|這不只是|這不只" "$filtered" 2>/dev/null || true)
  if [[ -n "$p3" ]]; then
    output+="\n  [3] 這不是/這不只是:\n$(echo "$p3" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p3" | wc -l | tr -d ' ')))
  fi

  # 4. 不再是
  local p4
  p4=$(grep -nE "不再是|不再只|不再僅" "$filtered" 2>/dev/null || true)
  if [[ -n "$p4" ]]; then
    output+="\n  [4] 不再是/不再只:\n$(echo "$p4" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p4" | wc -l | tr -d ' ')))
  fi

  # 5. 真正的X / 看似
  local p5
  p5=$(grep -nE "看似[^，。]{1,40}，?實則|表面上[^，。]{1,40}，?實際|真正的.{1,20}不是" "$filtered" 2>/dev/null || true)
  if [[ -n "$p5" ]]; then
    output+="\n  [5] 真正的X不是/看似X實則:\n$(echo "$p5" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p5" | wc -l | tr -d ' ')))
  fi

  # 6. 非單純
  local p6
  p6=$(grep -nE "非單純|非僅|非一般的" "$filtered" 2>/dev/null || true)
  if [[ -n "$p6" ]]; then
    output+="\n  [6] 非單純/非僅:\n$(echo "$p6" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p6" | wc -l | tr -d ' ')))
  fi

  # 7. 不等於 + 對位
  local p7
  p7=$(grep -nE "不等於[^，。]{0,40}，.*(而是|就是)|不意味著[^，。]{0,40}，.*(而是|就是)|不代表[^，。]{0,40}，.*(而是|就是)" "$filtered" 2>/dev/null || true)
  if [[ -n "$p7" ]]; then
    output+="\n  [7] 不等於/不意味/不代表 + 對位:\n$(echo "$p7" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p7" | wc -l | tr -d ' ')))
  fi

  # 8. Heading 含對位
  local p8
  p8=$(grep -nE "^#+.*不是.*[孤獨](?!.*$)" "$filtered" 2>/dev/null || true)
  if [[ -n "$p8" ]]; then
    output+="\n  [8] Heading 含對位句型:\n$(echo "$p8" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p8" | wc -l | tr -d ' ')))
  fi

  # 9. 破折號連用
  local p9
  p9=$(grep -nE "——[^。]{0,40}——" "$filtered" 2>/dev/null || true)
  if [[ -n "$p9" ]]; then
    output+="\n  [9] 破折號連用（同段 2 個以上「——」）:\n$(echo "$p9" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p9" | wc -l | tr -d ' ')))
  fi

  # 10. 破折號密度（用過濾後內容算）
  local total_chars=$(wc -c < "$filtered" | tr -d ' ')
  local em_dash_count=$(grep -o -- '——' "$filtered" | wc -l | tr -d ' ')
  if [[ $total_chars -gt 0 ]]; then
    local density_per_1k=$((em_dash_count * 1000 / total_chars))
    if [[ $density_per_1k -gt 4 ]]; then
      output+="\n  [10] 破折號密度偏高: $em_dash_count 個 / $total_chars 字元（每千字 $density_per_1k 個，建議 ≤4）"
      t1=$((t1 + 1))
    fi
  fi

  # 11. ，而是 / ，就是說
  local p11
  p11=$(grep -nE "，而是|，就是說" "$filtered" 2>/dev/null || true)
  if [[ -n "$p11" ]]; then
    output+="\n  [11] 含「，而是」或「，就是說」（檢查是否構成對位句型）:\n$(echo "$p11" | sed 's/^/      /')"
    t1=$((t1 + $(echo "$p11" | wc -l | tr -d ' ')))
  fi

  # ════════════════════════════════════════════════════════════════════
  # TIER 2 — AI 抽象 metaphor density（同篇 ≥ 2 次即警告 + 口語建議）
  # ════════════════════════════════════════════════════════════════════

  local tier2_output=""
  for word in "${TIER2_WORDS[@]}"; do
    local count
    count=$(grep -c "$word" "$filtered" 2>/dev/null | head -1)
    count=${count:-0}
    if [[ $count -ge 2 ]]; then
      local lines
      lines=$(grep -n "$word" "$filtered" 2>/dev/null | awk -F: '{print "L"$1}' | tr '\n' ' ' | sed 's/ $//')
      local suggest
      suggest=$(suggest_tier2 "$word")
      tier2_output+="\n      ⚠ $word ($count 次): $lines"
      tier2_output+="\n         建議：$suggest"
      t2=$((t2 + 1))
    fi
  done
  if [[ -n "$tier2_output" ]]; then
    output+="\n  [12] AI 抽象 metaphor 密度警告（≥2 次 = 偷懶 reach；單次出現未列）:$tier2_output"
  fi

  # ════════════════════════════════════════════════════════════════════
  # TIER 3 — AI 句首/結尾 ritual 語（≥ 1 次即警告 + 口語建議）
  # ════════════════════════════════════════════════════════════════════

  local tier3_output=""
  local seen_phrases=""
  for phrase in "${TIER3_PHRASES[@]}"; do
    # 避免子字串重複（從某種意義上 contains 從某種意義）— 用 grep -F fixed string
    local hits
    hits=$(grep -nF "$phrase" "$filtered" 2>/dev/null || true)
    if [[ -n "$hits" ]]; then
      local count
      count=$(echo "$hits" | wc -l | tr -d ' ')
      local suggest
      suggest=$(suggest_tier3 "$phrase")
      tier3_output+="\n      ⚠ $phrase ($count 次):"
      tier3_output+="\n$(echo "$hits" | sed 's/^/        /')"
      tier3_output+="\n         建議：$suggest"
      t3=$((t3 + count))
    fi
  done
  if [[ -n "$tier3_output" ]]; then
    output+="\n  [13] AI 句首/結尾 ritual 語（罐頭片語）:$tier3_output"
  fi

  rm -f "$filtered"

  # ════════════════════════════════════════════════════════════════════
  # 結算與輸出
  # ════════════════════════════════════════════════════════════════════

  local total=$((t1 + t2 + t3))
  if [[ $total -gt 0 ]]; then
    local emoji="🚨"
    if [[ $t1 -eq 0 ]]; then emoji="⚠️ "; fi
    echo "$emoji $f — Tier 1: $t1 / Tier 2: $t2 / Tier 3: $t3"
    echo -e "$output"
    echo ""
    files_with_violations=$((files_with_violations + 1))
    total_t1=$((total_t1 + t1))
    total_t2=$((total_t2 + t2))
    total_t3=$((total_t3 + t3))
  else
    echo "✓ $f — 0 violations（含 context-aware 排除：frontmatter / footnote def / code block / 直引）"
  fi
}

# Dispatcher
if [[ "$1" == "-" ]]; then
  text=$(cat)
  handle_inline_text "$text"
elif [[ "$1" == "--text" ]]; then
  shift
  handle_inline_text "$*"
else
  for arg in "$@"; do
    check_file "$arg"
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
total=$((total_t1 + total_t2 + total_t3))
if [[ $total -eq 0 ]]; then
  echo "✅ ALL CLEAR"
  exit 0
fi

echo "📊 Tier 1（HARD）  : $total_t1 violations"
echo "📊 Tier 2（DENSITY）: $total_t2 warnings — AI 抽象 metaphor 重複出現"
echo "📊 Tier 3（RITUAL） : $total_t3 warnings — AI 罐頭片語"
echo "📊 共 $files_with_violations files 有違反或警告"
echo ""
echo "MANIFESTO §11 + AI 文體節制原則："
echo "  - Tier 1: 避免「不是X是Y」對位句型 + 破折號連用（HARD）"
echo "  - Tier 2: 避免重複用 AI-default 抽象 metaphor 詞（重量／縮影／軌跡／DNA／...）"
echo "           ≥2 次 = 同篇偷懶 reach；改用具體場景或數字"
echo "           若為合理用法（如戰鬥機軌跡的物理意義），可忽略"
echo "  - Tier 3: 避免 AI 罐頭片語（在這個意義上／不可或缺／並非偶然／...）"
echo ""
echo "Context-aware 已自動排除：frontmatter / footnote def / code block / 「直引」內容"
echo "Canonical: docs/semiont/MANIFESTO.md §11 書寫節制"

if [[ $total_t1 -gt 0 ]] || [[ $STRICT -eq 1 && $total -gt 0 ]]; then
  exit 1
fi
exit 0
