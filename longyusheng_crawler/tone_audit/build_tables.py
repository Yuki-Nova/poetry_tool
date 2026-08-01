# -*- coding: utf-8 -*-
"""M-A: 生成两张权威平仄表（古今音双表方案）

classic（中古） ← 平水韵推导（上平+下平→平，上去入→仄），词林正韵交叉校验
modern（现代）  ← 中华新韵推导（平→平，仄→仄）
多音字：同一字在平水韵同时现于平/仄部 → 标「多」

输出：
  output/tones-classic.json   {字: 平|仄|多}
  output/tones-modern.json    {字: 平|仄|多}
  output/rhyme_cross_conflict.md  平水韵 vs 词林正韵 交叉疑点清单（D 类）

用法：python tone_audit/build_tables.py
数据源：chinese_word_rhyme-main/data/{Pingshui,Cilin,Xinyun}_Rhyme.json
"""

import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # longyusheng_crawler/
UPSTREAM = os.path.join(os.path.dirname(BASE_DIR), "chinese_word_rhyme-main", "data")
OUT_DIR = os.path.join(BASE_DIR, "tone_audit", "output")
os.makedirs(OUT_DIR, exist_ok=True)


def load(name):
    with open(os.path.join(UPSTREAM, name), encoding="utf-8") as f:
        return json.load(f)


def build_classic():
    """平水韵 → classic 表；词林正韵交叉校验 → D 类疑点"""
    ps = load("Pingshui_Rhyme.json")
    cl = load("Cilin_Rhyme.json")

    ping = set()   # 平（上平/下平）
    ze = set()     # 仄（上/去/入）
    for part, groups in ps.items():
        target = ping if ("平声" in part) else ze  # 上平声部/下平声部
        for chars in groups.values():
            target.update(chars)

    # 多音字：同时出现在平/仄 → 标「多」
    classic = {}
    for ch in ping | ze:
        is_ping = ch in ping
        is_ze = ch in ze
        classic[ch] = "多" if (is_ping and is_ze) else ("平" if is_ping else "仄")

    # 交叉校验：词林正韵同字平仄 vs 平水韵（仅报告不一致，不自动改）
    cl_tone = {}
    for groups in cl.values():
        for tone_key, chars in groups.items():
            t = "平" if "平" in tone_key else "仄"
            for ch in chars:
                if ch in cl_tone and cl_tone[ch] != t:
                    cl_tone[ch] = "多"
                else:
                    cl_tone[ch] = t

    conflicts = []
    for ch, t in classic.items():
        if ch in cl_tone and cl_tone[ch] != t and t != "多" and cl_tone[ch] != "多":
            conflicts.append((ch, t, cl_tone[ch]))
    conflicts.sort()

    with open(os.path.join(OUT_DIR, "rhyme_cross_conflict.md"), "w", encoding="utf-8") as f:
        f.write("# 平水韵 vs 词林正韵 交叉疑点（D 类，人工裁决）\n\n")
        f.write(f"共 {len(conflicts)} 处不一致：\n\n")
        f.write("| 字 | 平水韵 | 词林正韵 |\n|---|---|---|\n")
        for ch, t1, t2 in conflicts:
            f.write(f"| {ch} | {t1} | {t2} |\n")

    return classic, conflicts


def build_modern():
    """中华新韵 → modern 表"""
    xy = load("Xinyun_Rhyme.json")
    modern = {}
    for groups in xy.values():
        ping = set(groups.get("平", []))
        ze = set(groups.get("仄", []))
        for ch in ping | ze:
            if ch in modern:
                continue  # 同一字出现在多韵部时以首个为准（新韵一般单一）
            modern[ch] = "多" if (ch in ping and ch in ze) else ("平" if ch in ping else "仄")
    return modern


def main():
    classic, conflicts = build_classic()
    modern = build_modern()

    def stat(tbl, name):
        cnt = {"平": 0, "仄": 0, "多": 0}
        for t in tbl.values():
            cnt[t] += 1
        print(f"{name}: 共 {len(tbl)} 字（平 {cnt['平']} / 仄 {cnt['仄']} / 多 {cnt['多']}）")

    with open(os.path.join(OUT_DIR, "tones-classic.json"), "w", encoding="utf-8") as f:
        json.dump(classic, f, ensure_ascii=False, sort_keys=True)
    with open(os.path.join(OUT_DIR, "tones-modern.json"), "w", encoding="utf-8") as f:
        json.dump(modern, f, ensure_ascii=False, sort_keys=True)

    stat(classic, "classic（平水韵推导）")
    stat(modern, "modern（中华新韵推导）")
    print(f"D 类交叉疑点: {len(conflicts)} 处 → {os.path.join(OUT_DIR, 'rhyme_cross_conflict.md')}")
    print(f"classic → {os.path.join(OUT_DIR, 'tones-classic.json')}")
    print(f"modern  → {os.path.join(OUT_DIR, 'tones-modern.json')}")


if __name__ == "__main__":
    main()
