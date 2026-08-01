# -*- coding: utf-8 -*-
"""M-D: 应用补丁到前端 tones.json + 生成前端双表数据文件

应用：
  A 类 2 处：数→仄、还→平（所有读法同声调，改单声调以暴露出律）
  C 类 277 处：补「多」
  E 类 53 处：补录（龙榆生例词缺字，从双表取声调）

同时：
  - 将 tones-classic.json / tones-modern.json 复制到 tool/src/data/
  - 输出移除多音候选提示的字（A 类修正后候选无平仄歧义，需从 charClassifier 移除）

用法：python tone_audit/apply_patch.py
"""

import json
import os
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "tone_audit", "output")
TOOLS_DATA = os.path.join(os.path.dirname(BASE_DIR), "tool", "src", "data")

TONES_PATH = os.path.join(TOOLS_DATA, "tones.json")


def main():
    proposal = json.load(open(os.path.join(OUT_DIR, "tone_patch_proposal.json"), encoding="utf-8"))
    tones = json.load(open(TONES_PATH, encoding="utf-8"))
    if isinstance(tones, dict) and "tones" in tones:
        tones_dict = tones["tones"]
    else:
        tones_dict = tones

    # A: 修正
    for ch, t in proposal["A_fix"].items():
        tones_dict[ch] = t
    # C: 补多
    for ch in proposal["C_mark_multi"]:
        tones_dict[ch] = "多"
    # E: 补录
    for ch, t in proposal["E_add"].items():
        tones_dict[ch] = t

    with open(TONES_PATH, "w", encoding="utf-8") as f:
        json.dump(tones, f, ensure_ascii=False, indent=2)
    print(f"tones.json 已更新: {len(tones_dict)} 字（A {len(proposal['A_fix'])} / C {len(proposal['C_mark_multi'])} / E {len(proposal['E_add'])}）")

    # 复制双表到前端数据目录
    for name in ("tones-classic.json", "tones-modern.json"):
        src = os.path.join(OUT_DIR, name)
        dst = os.path.join(TOOLS_DATA, name)
        shutil.copy2(src, dst)
        print(f"已复制 {name} → tool/src/data/")


if __name__ == "__main__":
    main()
