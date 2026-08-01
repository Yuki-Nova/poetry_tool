# -*- coding: utf-8 -*-
"""对比验证器：龙榆生解析结果 vs server/data/cipai.db（只读）

输出 cipai_diff_report.md：
- 匹配方式：name 精确 → alias 匹配 → 未匹配
- 对比项：字数 / 句数 / 每句长度 / 逐字平仄 / 韵脚位置 / rhymeType
- 统计：完全一致 / 仅差异 / 仅龙榆生有 / 仅现库有
"""

import json
import os
import sqlite3
import sys

import config

DB_PATH = os.path.join(config.BASE_DIR, "..", "server", "data", "cipai.db")


def load_db():
    """只读加载现库词牌。"""
    if not os.path.exists(DB_PATH):
        print(f"⚠ 未找到 cipai.db: {DB_PATH}")
        return {}
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT id, name, alias, charCount, sentences, notes FROM cipai").fetchall()
    conn.close()
    result = {}
    for r in rows:
        try:
            result[r["id"]] = {
                "id": r["id"],
                "name": r["name"],
                "alias": json.loads(r["alias"] or "[]"),
                "charCount": r["charCount"],
                "sentences": json.loads(r["sentences"]),
                "notes": r["notes"] or "",
            }
        except json.JSONDecodeError:
            print(f"⚠ 词牌 {r['id']} 数据损坏，跳过")
    print(f"现库词牌数: {len(result)}")
    return result


def sentences_signature(sentences):
    """句结构签名：[(length, pattern_tuple, isRhyme, rhymeType)]"""
    return [
        (s.get("length"), tuple(s.get("pattern", [])), s.get("isRhyme", False), s.get("rhymeType"))
        for s in sentences
    ]


def compare(ly, db):
    """对比两个词牌的格律，返回差异描述列表。"""
    diffs = []
    ly_sig = sentences_signature(ly["sentences"])
    db_sig = sentences_signature(db["sentences"])

    if len(ly_sig) != len(db_sig):
        diffs.append(f"句数不同: 龙{len(ly_sig)} vs 库{len(db_sig)}")
    if ly["charCount"] != db["charCount"]:
        diffs.append(f"字数不同: 龙{ly['charCount']} vs 库{db['charCount']}")

    n = min(len(ly_sig), len(db_sig))
    for i in range(n):
        ls, ds = ly_sig[i], db_sig[i]
        if ls[0] != ds[0]:
            diffs.append(f"第{i+1}句长度: 龙{ls[0]} vs 库{ds[0]}")
            continue
        # 逐字平仄
        tone_diffs = []
        for j in range(ls[0]):
            if ls[1][j] != ds[1][j]:
                tone_diffs.append(f"{j+1}字:{ls[1][j]}→{ds[1][j]}")
        if tone_diffs:
            diffs.append(f"第{i+1}句平仄差异({len(tone_diffs)}处): {','.join(tone_diffs[:6])}")
        # 韵脚
        if ls[2] != ds[2]:
            diffs.append(f"第{i+1}句韵脚: 龙{'韵' if ls[2] else '-'} vs 库{'韵' if ds[2] else '-'}")
        if ls[2] and ls[3] != ds[3]:
            diffs.append(f"第{i+1}句韵类: 龙{ls[3]} vs 库{ds[3]}")
    return diffs


def main():
    with open(os.path.join(config.OUTPUT_DIR, "longyusheng_cipai_schema.json"), encoding="utf-8") as f:
        ly_list = json.load(f)
    db_map = load_db()

    # 匹配（单条目模型：全部参与对比；无 variantOf 拆分条目）
    matched, unmatched_ly, unmatched_db = [], [], []
    db_by_name = {v["name"]: v for v in db_map.values()}
    db_used = set()

    for ly in ly_list:
        hit = db_by_name.get(ly["name"])
        if not hit:
            for db in db_map.values():
                if ly["name"] in db["alias"] or db["name"] in ly["alias"]:
                    hit = db
                    break
        if hit:
            matched.append((ly, hit))
            db_used.add(hit["id"])
        else:
            unmatched_ly.append(ly)

    for db in db_map.values():
        if db["id"] not in db_used:
            unmatched_db.append(db)

    # 统计
    identical, differ = [], []
    for ly, db in matched:
        diffs = compare(ly, db)
        if not diffs:
            identical.append((ly, db))
        else:
            differ.append((ly, db, diffs))

    # 写出报告
    lines = []
    lines.append("# 词牌格律对比报告（龙榆生 vs 现库 cipai.db）\n")
    lines.append(f"- 龙榆生词牌: {len(ly_list)}")
    lines.append(f"- 现库词牌: {len(db_map)}")
    lines.append(f"- 匹配成功: {len(matched)}")
    lines.append(f"- 完全一致: {len(identical)}")
    lines.append(f"- 存在差异: {len(differ)}")
    lines.append(f"- 仅龙榆生有: {len(unmatched_ly)}")
    lines.append(f"- 仅现库有: {len(unmatched_db)}\n")

    lines.append("## 一、存在差异的词牌\n")
    lines.append("| 词牌 | 差异数 | 差异摘要 |")
    lines.append("|---|---|---|")
    for ly, db, diffs in sorted(differ, key=lambda x: len(x[2]), reverse=True):
        lines.append(f"| {ly['name']} | {len(diffs)} | {'；'.join(diffs[:4])}{'…' if len(diffs)>4 else ''} |")

    lines.append("\n## 二、完全一致的词牌\n")
    lines.append("、".join(ly["name"] for ly, _ in sorted(identical, key=lambda x: x[0]["name"])) or "（无）")

    lines.append("\n## 三、仅龙榆生有（现库缺失）\n")
    lines.append("、".join(ly["name"] for ly in sorted(unmatched_ly, key=lambda x: x["name"])) or "（无）")

    lines.append("\n## 四、仅现库有（龙榆生未收录）\n")
    lines.append("、".join(db["name"] for db in sorted(unmatched_db, key=lambda x: x["name"])) or "（无）")

    report = "\n".join(lines)
    with open(config.DIFF_REPORT, "w", encoding="utf-8") as f:
        f.write(report)
    print(report[:3000])
    print(f"\n报告已写入: {config.DIFF_REPORT}")


if __name__ == "__main__":
    main()
