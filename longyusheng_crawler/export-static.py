# -*- coding: utf-8 -*-
"""export-static.py — 词牌数据静态导出（Python 标准库 sqlite3 + json，零依赖）

用途：P0 集成方案 —— 诗词工具去后端化。把本地权威库 cipai.db 全量导出为
静态 JSON（tool/public/cipai.json），vite 构建时自动拷入 dist，前端 useCipai
改为 fetch('cipai.json') 即可，彻底替代 GET /api/cipai。

输出形状 = server GET /api/cipai 响应（routes/cipai.js + models/cipai.js rowToCipai）：
  { "code": 0, "data": [ {id, name, alias, charCount, sentences, formats, notes,
                          examples, createdAt, updatedAt}, ... ] }
⚠ 必须保持该包裹形状：前端 useCipai.js:33 读 json.data（唯一解包点），裸数组会让
  P1「仅换 URL」不成立。字段名/顺序与 rowToCipai 一致（含 createdAt/updatedAt）。

用法：
  python export-static.py [--out <path>]
  默认输出 tool/public/cipai.json（vite public/ 目录，构建自动进 dist）
"""

import json
import os
import sqlite3
import sys

from cipai_validator import validate_cipai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "server", "data", "cipai.db"))
DEFAULT_OUT = os.path.normpath(os.path.join(BASE_DIR, "..", "tool", "public", "cipai.json"))

# --out 覆盖输出路径
out_path = DEFAULT_OUT
args = sys.argv[1:]
if "--out" in args:
    i = args.index("--out")
    if i + 1 < len(args):
        out_path = os.path.abspath(args[i + 1])

if not os.path.exists(DB_PATH):
    print("未找到 cipai.db:", DB_PATH)
    sys.exit(1)


def row_to_cipai(row):
    """与 server/models/cipai.js rowToCipai 逐字段对齐。"""
    return {
        "id": row[0],
        "name": row[1],
        "alias": json.loads(row[2] or "[]"),
        "charCount": row[3],
        "sentences": json.loads(row[4] or "[]"),
        "formats": json.loads(row[5] or "[]"),
        "notes": row[6] or "",
        "examples": json.loads(row[7] or "[]"),
        "createdAt": row[8],
        "updatedAt": row[9],
    }


conn = sqlite3.connect(DB_PATH)
conn.row_factory = None
rows = conn.execute(
    "SELECT id, name, alias, charCount, sentences, formats, notes, examples, created_at, updated_at "
    "FROM cipai ORDER BY name ASC"  # 与 models/cipai.js list() 的 ORDER BY name ASC 一致
).fetchall()
conn.close()

data = [row_to_cipai(r) for r in rows]

# 导出前同样过门禁（防止带病数据被发布到前端）
gate_failures = 0
for c in data:
    result = validate_cipai(c)
    if not result["valid"]:
        gate_failures += 1
        print(f"✗ 门禁失败 [{c['id']} / {c['name']}]: {result['errors'][:3]}")
if gate_failures > 0:
    print(f"门禁未通过: {gate_failures} 条，导出已阻断")
    sys.exit(2)

payload = {"code": 0, "data": data}

os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)

size_kb = os.path.getsize(out_path) / 1024
print(f"已导出 {len(data)} 条 → {out_path} ({size_kb:.0f} KB)")
print(f"形状断言: code==={payload['code']} data.length==={len(payload['data'])}")

# 快速抽样验证
for name in ("临江仙", "满江红", "卜算子", "十六字令"):
    hit = next((c for c in data if c["name"] == name), None)
    if hit:
        print(f"  抽样 {name}: {hit['charCount']}字 formats={len(hit['formats'])}格 examples={len(hit['examples'])}条")
