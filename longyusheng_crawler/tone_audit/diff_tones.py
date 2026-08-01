# -*- coding: utf-8 -*-
"""M-B: 现有 tones.json vs 双表 → 差异分类报告

分类：
  A 确凿错误（单表矛盾）：tones=平 但 classic=仄 且 modern=仄（或反向：tones=仄 但两表都平）
  B 古今音差异（需双表）：tones=仄 但 modern=平（如入声字）；或 tones=平 但 classic=仄 且 modern=平
  C 多音字缺失：classic/modern 标「多」，tones 只标单声调
  D 数据冲突：classic 与 modern 平仄矛盾（已由 build_tables 输出疑点清单，此处仅汇总涉及 tones 的）

输出：output/tone_diff_report.md
用法：python tone_audit/diff_tones.py
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "tone_audit", "output")

TOOLS_DATA = os.path.join(os.path.dirname(BASE_DIR), "tool", "src", "data")


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def main():
    tones = load(os.path.join(TOOLS_DATA, "tones.json"))
    if isinstance(tones, dict) and "tones" in tones and isinstance(tones["tones"], dict):
        tones = tones["tones"]
    classic = load(os.path.join(OUT_DIR, "tones-classic.json"))
    modern = load(os.path.join(OUT_DIR, "tones-modern.json"))
    custom = load(os.path.join(TOOLS_DATA, "custom.json"))
    custom_tones = custom.get("tones", {}) if isinstance(custom, dict) else {}

    A, B, C, D, E = [], [], [], [], []
    for ch, t in sorted(tones.items()):
        if ch in custom_tones:
            continue  # 人工覆盖优先，不参与自动分类
        c = classic.get(ch)
        m = modern.get(ch)
        if c is None and m is None:
            continue  # 双表都没收录（归 M-C 未收录处理）
        if c == "多" or m == "多":
            if t != "多":
                C.append((ch, t, c, m))
            continue
        # A: 两表一致且与 tones 矛盾
        if c is not None and m is not None and c == m and c != t:
            A.append((ch, t, c))
            continue
        # B: 古今音差异（两表不一致，tones 与其中一表一致或都不一致）
        if c is not None and m is not None and c != m:
            if t != c and t != m:
                # 两表都没覆盖 tones 的标注 → D 类（数据冲突）
                D.append((ch, t, c, m))
            else:
                B.append((ch, t, c, m))
            continue
        # 仅一表收录
        single = c if c is not None else m
        if single != t:
            if c is not None and m is None:
                B.append((ch, t, c, None))   # 中古表有、现代表无 → 古典字
            elif c is None and m is not None:
                B.append((ch, t, None, m))   # 现代表有、中古表无 → 现代字

    # 未收录：双表都没有但 tones 有（反向不构成问题）；+ 常用字在双表之一有而 tones 无
    for ch in sorted(set(classic) | set(modern)):
        if ch not in tones and ch not in custom_tones:
            E.append(ch)

    def render_row(ch, t, c, m):
        return f"| {ch} | {t} | {c or '—'} | {m or '—'} |"

    with open(os.path.join(OUT_DIR, "tone_diff_report.md"), "w", encoding="utf-8") as f:
        f.write("# 平仄表错漏检查报告（tones.json vs 双表）\n\n")
        f.write(f"> 生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write("## 统计\n\n")
        f.write(f"- A 确凿错误（两表一致但与 tones 矛盾）: **{len(A)}**\n")
        f.write(f"- B 古今音差异（需双表解决）: **{len(B)}**\n")
        f.write(f"- C 多音字缺失（双表标「多」，tones 单声调）: **{len(C)}**\n")
        f.write(f"- D 数据冲突（两表互相矛盾且 tones 与两表均不同）: **{len(D)}**\n")
        f.write(f"- E 未收录（双表有但 tones 无）: **{len(E)}**\n\n")

        f.write("## A 类：确凿错误（可直接修复 tones.json）\n\n")
        f.write("| 字 | tones | classic/modern |\n|---|---|---|\n")
        for ch, t, c in A:
            f.write(f"| {ch} | {t} | {c} |\n")

        f.write("\n## B 类：古今音差异（双表方案解决，不改单表）\n\n")
        f.write("| 字 | tones | classic | modern |\n|---|---|---|---|\n")
        for ch, t, c, m in B:
            f.write(render_row(ch, t, c, m) + "\n")

        f.write("\n## C 类：多音字缺失（应标「多」）\n\n")
        f.write("| 字 | tones | classic | modern |\n|---|---|---|---|\n")
        for ch, t, c, m in C:
            f.write(render_row(ch, t, c, m) + "\n")

        f.write("\n## D 类：数据冲突（人工裁决）\n\n")
        f.write("| 字 | tones | classic | modern |\n|---|---|---|---|\n")
        for ch, t, c, m in D:
            f.write(render_row(ch, t, c, m) + "\n")

        f.write("\n## E 类：未收录（tones 无此字）\n\n")
        f.write(f"共 {len(E)} 字，前 200 个：\n\n")
        f.write("```\n" + " ".join(E[:200]) + "\n```\n")

    print(f"A 确凿错误: {len(A)}")
    print(f"B 古今音差异: {len(B)}")
    print(f"C 多音字缺失: {len(C)}")
    print(f"D 数据冲突: {len(D)}")
    print(f"E 未收录: {len(E)}")
    print(f"报告 → {os.path.join(OUT_DIR, 'tone_diff_report.md')}")


if __name__ == "__main__":
    main()
