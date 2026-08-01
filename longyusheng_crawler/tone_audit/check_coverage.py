# -*- coding: utf-8 -*-
"""M-C: 未收录字检查（check_coverage.py）

检查范围（按优先级）：
  1. 龙榆生 153 词牌全部字位（格律谱中出现的每个字）— 用户实际使用面
  2. 中华新韵 6730 字 − tones.json 已有字 = 现代常用字缺口
  3. 平水韵 8232 字 − tones.json = 中古字缺口
  4. GB2312 一级汉字（3755 常用字）− tones.json = 基础缺口
  5. 可选：龙榆生例词文本（ces JS 变量）中的字

输出：output/tone_coverage_report.md
用法：python tone_audit/check_coverage.py
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "tone_audit", "output")
TOOLS_DATA = os.path.join(os.path.dirname(BASE_DIR), "tool", "src", "data")
UPSTREAM = os.path.join(os.path.dirname(BASE_DIR), "chinese_word_rhyme-main", "data")


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def gb2312_level1():
    """生成 GB2312 一级汉字（3755 个）— 按区位码 16-55 区"""
    chars = []
    for qu in range(16, 56):
        for wei in range(1, 95):
            code = (qu + 0xA0) << 8 | (wei + 0xA0)
            try:
                chars.append(bytes([code >> 8, code & 0xFF]).decode('gb2312'))
            except (UnicodeDecodeError, ValueError):
                pass
    return set(chars)


def main():
    tones = load(os.path.join(TOOLS_DATA, "tones.json"))
    if isinstance(tones, dict) and "tones" in tones:
        tones = tones["tones"]
    tones_set = set(tones)
    custom = load(os.path.join(TOOLS_DATA, "custom.json"))
    custom_tones = set(custom.get("tones", {}).keys())

    classic = load(os.path.join(OUT_DIR, "tones-classic.json"))
    modern = load(os.path.join(OUT_DIR, "tones-modern.json"))

    # 1. 龙榆生词牌字位
    with open(os.path.join(BASE_DIR, "output", "longyusheng_cipai_schema.json"), encoding="utf-8") as f:
        cipai_list = json.load(f)
    # 词牌格律谱只含 平/仄/可平可仄 标记，不含实际汉字 → 改用例词文本
    example_chars = set()
    for c in cipai_list:
        for ex in c.get("examples", []):
            example_chars.update(re.findall(r"[\u4e00-\u9fff]", ex.get("text", "")))
    missing_examples = sorted(ch for ch in example_chars if ch not in tones_set and ch not in custom_tones)

    # 2/3. 新韵/平水韵缺口
    missing_modern = sorted(ch for ch in modern if ch not in tones_set and ch not in custom_tones)
    missing_classic = sorted(ch for ch in classic if ch not in tones_set and ch not in custom_tones)

    # 4. GB2312 一级
    l1 = gb2312_level1()
    missing_l1 = sorted(ch for ch in l1 if ch not in tones_set and ch not in custom_tones)

    with open(os.path.join(OUT_DIR, "tone_coverage_report.md"), "w", encoding="utf-8") as f:
        f.write("# 平仄表覆盖率报告（未收录字检查）\n\n")
        f.write(f"> 生成时间: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
        f.write("## 统计\n\n")
        f.write(f"- 龙榆生例词文本字（153 词牌全部例词）: {len(example_chars)} 个不同字，缺 {len(missing_examples)}\n")
        f.write(f"- 中华新韵字 − tones: {len(missing_modern)}\n")
        f.write(f"- 平水韵字 − tones: {len(missing_classic)}\n")
        f.write(f"- GB2312 一级（3755 常用字）− tones: {len(missing_l1)}\n\n")

        f.write("## 1. 龙榆生例词缺字（实际使用面，优先级最高）\n\n")
        f.write("```\n" + " ".join(missing_examples) + "\n```\n\n")

        f.write("## 2. 新韵缺字（现代常用字，前 300）\n\n")
        f.write("```\n" + " ".join(missing_modern[:300]) + "\n```\n\n")

        f.write("## 3. 平水韵缺字（中古字，前 300）\n\n")
        f.write("```\n" + " ".join(missing_classic[:300]) + "\n```\n\n")

        f.write("## 4. GB2312 一级缺字（基础缺口，前 200）\n\n")
        f.write("```\n" + " ".join(missing_l1[:200]) + "\n```\n")

    print(f"龙榆生例词字: {len(example_chars)} 缺 {len(missing_examples)}")
    print(f"新韵缺字: {len(missing_modern)}")
    print(f"平水韵缺字: {len(missing_classic)}")
    print(f"GB2312 一级缺字: {len(missing_l1)}")
    print(f"报告 → {os.path.join(OUT_DIR, 'tone_coverage_report.md')}")


if __name__ == "__main__":
    main()
