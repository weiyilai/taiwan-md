#!/usr/bin/env python3
"""
validate-china-fp-tsv.py — china-term-false-positives.tsv 結構驗證

驗證規則：每筆 TSV 條目的 cterm 應該是 pattern 的子字串。
若 cterm 不在 pattern 中，代表這條規則的 false_positive 扣除邏輯可能
與預期不符（quality-scan.sh 對 pattern 獨立 grep，與 cterm 命中無關）。

輸出 warn，不 fail — 現有文章暫無實害，但需要人工確認設計意圖。

用法：
    python3 scripts/tools/validate-china-fp-tsv.py
    python3 scripts/tools/validate-china-fp-tsv.py --tsv data/terminology/china-term-false-positives.tsv

背景：#616 #597 @notoriouslab 在 dry-run 中發現 3 條 cterm 不是 pattern 子字串的規則：
    鼠標 → 老鼠（單純含「鼠」字）
    鼠標 → 標記（單純含「標」字，無「鼠標」連用）
    高清 → 清高（「高潔的人」，"高""清" 倒序組合）
"""

import sys
import argparse
from pathlib import Path

DEFAULT_TSV = Path("data/terminology/china-term-false-positives.tsv")


def validate(tsv_path: Path) -> int:
    """驗證 TSV，回傳 warn 數量（不影響 exit code）"""
    if not tsv_path.exists():
        print(f"✗ 找不到 TSV 檔案：{tsv_path}")
        return 1

    bugs = []
    total = 0

    with open(tsv_path, encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.rstrip("\n")
            # 跳過空行和 comment
            if not line or line.startswith("#"):
                continue
            parts = line.split("\t")
            if len(parts) < 2:
                print(f"  ⚠️  第 {lineno} 行：欄位不足（需要至少 2 欄，tab 分隔）")
                continue
            cterm, pattern = parts[0], parts[1]
            note = parts[2] if len(parts) >= 3 else ""
            total += 1
            if cterm not in pattern:
                bugs.append((lineno, cterm, pattern, note))

    print(f"TSV 路徑：{tsv_path}")
    print(f"共 {total} 條規則")

    if bugs:
        print(f"\n⚠️  警告：{len(bugs)} 條規則的 cterm 不是 pattern 的子字串")
        print("   這些規則的 false_positive 扣除邏輯可能與預期不符。")
        print("   quality-scan.sh 對 false_positive pattern 獨立 grep，與 cterm 是否命中無關。")
        print("   請確認是刻意設計（如「鼠標」→「老鼠」想扣除所有含「鼠」的文章命中）")
        print("   還是應該修正 pattern 使其包含 cterm 子字串。\n")
        for lineno, cterm, pattern, note in bugs:
            note_str = f"  # {note}" if note else ""
            print(f"   第 {lineno:3d} 行：cterm={cterm!r}  pattern={pattern!r}{note_str}")
        print()
    else:
        print("✓ 所有規則的 cterm 都是 pattern 的子字串，結構正確")

    return len(bugs)


def main():
    parser = argparse.ArgumentParser(description="驗證 china-term-false-positives.tsv 結構")
    parser.add_argument("--tsv", type=Path, default=DEFAULT_TSV, help="TSV 路徑")
    args = parser.parse_args()

    warn_count = validate(args.tsv)
    # warn 不 fail：exit 0 even if there are warnings
    sys.exit(0)


if __name__ == "__main__":
    main()
