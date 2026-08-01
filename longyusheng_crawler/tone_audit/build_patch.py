# -*- coding: utf-8 -*-
"""M-D: 生成修复补丁提案（A/C/E 类自动分类），供人工复核

输出：
  output/tone_patch_proposal.json  补丁提案
    {
      "A_fix":    {"字": "平|仄"},        # 确凿错误：tones 标多但实际单声调 → 修正
      "C_mark_multi": ["字", ...],        # 多音字缺失：双表标多 → tones 补「多」
      "E_add":    {"字": "平|仄|多"},     # 未收录：从双表补录（限龙榆生例词字 + 可配置范围）
      "stats": {...}
    }

用法：
  python tone_audit/build_patch.py                    # 默认：E 仅龙榆生例词缺字
  python tone_audit/build_patch.py --all              # E 补全部双表缺字（929+）
"""

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "tone_audit", "output")
TOOLS_DATA = os.path.join(os.path.dirname(BASE_DIR), "tool", "src", "data")


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    tones = load(os.path.join(TOOLS_DATA, "tones.json"))
    if isinstance(tones, dict) and "tones" in tones:
        tones = tones["tones"]
    classic = load(os.path.join(OUT_DIR, "tones-classic.json"))
    modern = load(os.path.join(OUT_DIR, "tones-modern.json"))
    custom = load(os.path.join(TOOLS_DATA, "custom.json"))
    custom_tones = set(custom.get("tones", {}).keys()) if isinstance(custom, dict) else set()

    A_fix, C_mark = {}, []
    for ch, t in sorted(tones.items()):
        if ch in custom_tones:
            continue
        c = classic.get(ch)
        m = modern.get(ch)
        # A: 两表一致且都为单声调，tones 标多 → 修正为实际声调
        if t == "多" and c == m and c in ("平", "仄"):
            A_fix[ch] = c
        # C: 双表任一标多，tones 非多 → 补多
        elif t != "多" and (c == "多" or m == "多"):
            C_mark.append(ch)

    # E: 未收录补录（默认仅龙榆生例词字；--all 全量）
    with open(os.path.join(BASE_DIR, "output", "longyusheng_cipai_schema.json"), encoding="utf-8") as f:
        cipai_list = json.load(f)
    example_chars = set()
    for c in cipai_list:
        for ex in c.get("examples", []):
            example_chars.update(ch for ch in ex.get("text", "") if "\u4e00" <= ch <= "\u9fff")

    if "--all" in sys.argv:
        candidates = set(classic) | set(modern)
    else:
        candidates = example_chars

    E_add = {}
    for ch in sorted(candidates):
        if ch in tones or ch in custom_tones:
            continue
        c = classic.get(ch)
        m = modern.get(ch)
        if c is None and m is None:
            continue
        if c == m:
            E_add[ch] = c
        elif c and m:
            E_add[ch] = "多" if (c == "多" or m == "多") else "多"  # 双表矛盾 → 多（保守）
        else:
            E_add[ch] = c or m

    proposal = {
        "A_fix": A_fix,
        "C_mark_multi": C_mark,
        "E_add": E_add,
        "stats": {
            "A": len(A_fix),
            "C": len(C_mark),
            "E": len(E_add),
        }
    }
    out = os.path.join(OUT_DIR, "tone_patch_proposal.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(proposal, f, ensure_ascii=False, indent=2)
    print(f"A 修正（多→单声调）: {len(A_fix)}")
    print(f"C 补多音字: {len(C_mark)}")
    print(f"E 补录: {len(E_add)}" + ("（龙榆生例词字）" if "--all" not in sys.argv else "（全量）"))
    print(f"提案 → {out}")


if __name__ == "__main__":
    main()
