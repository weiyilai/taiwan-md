#!/usr/bin/env bash
# people-title-check.sh v1.0 — People 類 title 冒號三明治規範遵守率檢查
# 對應 EDITORIAL.md 原則 5（v5.4，Issue #618）：People/ 條目 title 強制「人名：代表性弧線或場景」
#
# Advisory 工具（不擋 commit），用於：
#   1. 日常 dashboard KPI 顯示遵守率
#   2. 列出待 migrate 的長尾檔案
#   3. 新 PR 自我檢查
#
# Usage:
#   bash scripts/tools/people-title-check.sh              # 摘要報告
#   bash scripts/tools/people-title-check.sh --list       # 列出所有不符合的檔案
#   bash scripts/tools/people-title-check.sh --json       # JSON 輸出（dashboard 用）

set -uo pipefail
cd "$(dirname "$0")/../.."

KNOWLEDGE_DIR="knowledge/People"
JSON_MODE=false
LIST_MODE=false

for arg in "$@"; do
  [[ "$arg" == "--json" ]] && JSON_MODE=true
  [[ "$arg" == "--list" ]] && LIST_MODE=true
done

total=0
compliant=0
non_compliant=0
declare -a non_compliant_list=()

for filepath in "$KNOWLEDGE_DIR"/*.md; do
  [[ ! -f "$filepath" ]] && continue
  filename=$(basename "$filepath")
  # Skip hub / roadmap files (prefixed with _)
  [[ "$filename" == _* ]] && continue

  total=$((total + 1))

  # Extract title from frontmatter
  title=$(sed -n '/^---$/,/^---$/p' "$filepath" | grep -E "^title:" | head -1 | sed "s/title: *//; s/^['\"]//; s/['\"]$//")

  # Check: title must contain full-width colon ：
  if echo "$title" | grep -q "："; then
    compliant=$((compliant + 1))
  else
    non_compliant=$((non_compliant + 1))
    non_compliant_list+=("$filename|$title")
  fi
done

if [[ $total -eq 0 ]]; then
  echo "⚠️  找不到 $KNOWLEDGE_DIR 下的 .md 檔案，請確認路徑正確。"
  exit 1
fi

compliance_pct=$(echo "scale=1; $compliant * 100 / $total" | bc)

if $JSON_MODE; then
  # JSON output for dashboard integration
  echo "{"
  echo "  \"total\": $total,"
  echo "  \"compliant\": $compliant,"
  echo "  \"nonCompliant\": $non_compliant,"
  echo "  \"complianceRate\": $compliance_pct,"
  echo "  \"nonCompliantFiles\": ["
  for i in "${!non_compliant_list[@]}"; do
    fname=$(echo "${non_compliant_list[$i]}" | cut -d'|' -f1)
    comma=","; [[ $i -eq $((${#non_compliant_list[@]} - 1)) ]] && comma=""
    echo "    \"$fname\"$comma"
  done
  echo "  ]"
  echo "}"
else
  echo ""
  echo "👤 people-title-check v1.0 — People title 冒號三明治遵守率"
  echo "   規範：EDITORIAL.md 原則 5（v5.4）| Issue #618"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📊 總計：$total 篇"
  echo "   ✅ 符合（人名：副標）：$compliant 篇 ($compliance_pct%)"
  echo "   ❌ 待 migrate（純人名）：$non_compliant 篇"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [[ $non_compliant -gt 0 ]]; then
    if $LIST_MODE; then
      echo ""
      echo "❌ 待 migrate 完整清單（共 $non_compliant 篇）："
      for item in "${non_compliant_list[@]}"; do
        fname=$(echo "$item" | cut -d'|' -f1)
        title=$(echo "$item" | cut -d'|' -f2-)
        printf "   • %-40s  title: %s\n" "$fname" "$title"
      done
    else
      echo ""
      echo "   前 20 筆（用 --list 看完整清單）："
      count=0
      for item in "${non_compliant_list[@]}"; do
        fname=$(echo "$item" | cut -d'|' -f1)
        echo "   • $fname"
        count=$((count + 1))
        [[ $count -ge 20 ]] && echo "   ... 還有 $((non_compliant - 20)) 篇" && break
      done
    fi
    echo ""
    echo "📌 格式要求：「人名：代表性弧線或場景」"
    echo "   ❌ 張忠謀"
    echo "   ✅ 張忠謀：從德州儀器到台積電，半導體代工模式的發明者"
    echo ""
    echo "   Tier 化 sweep 計畫見 LESSONS-INBOX.md #2026-04-26-β-r2"
  else
    echo ""
    echo "✅ 全部 People 文章 title 均已符合冒號三明治規範！"
  fi
  echo ""
fi
