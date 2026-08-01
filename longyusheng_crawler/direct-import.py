# -*- coding: utf-8 -*-
"""龙榆生词牌数据直写导入脚本（幂等 upsert，Python 标准库 sqlite3，零依赖）

用法：
  python direct-import.py [--dry]
  --dry  试运行：只统计将要执行的变更，不写入

行为：
  - id 已存在 → UPDATE 覆盖（name/alias/charCount/sentences/formats/notes）
  - id 不存在 → INSERT 新增
  - 导入前自动备份 cipai.db → cipai.db.<timestamp>.bak
"""

import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.normpath(os.path.join(BASE_DIR, "..", "server", "data", "cipai.db"))
JSON_PATH = os.path.join(BASE_DIR, "output", "longyusheng_cipai_schema.json")

DRY_RUN = "--dry" in sys.argv

if not os.path.exists(DB_PATH):
    print("未找到 cipai.db:", DB_PATH)
    sys.exit(1)
if not os.path.exists(JSON_PATH):
    print("未找到导入数据:", JSON_PATH)
    sys.exit(1)

# ── 备份 ──
if not DRY_RUN:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    bak = os.path.join(os.path.dirname(DB_PATH), f"cipai.db.{ts}.bak")
    shutil.copy2(DB_PATH, bak)
    print(f"已备份 → {bak}")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode = WAL")
with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)

# 确保 formats/examples 列存在（老库兼容）
cols = [r[1] for r in conn.execute("PRAGMA table_info(cipai)").fetchall()]
if "formats" not in cols:
    conn.execute("ALTER TABLE cipai ADD COLUMN formats TEXT NOT NULL DEFAULT '[]'")
    print("已为存量库补充 formats 列")
if "examples" not in cols:
    conn.execute("ALTER TABLE cipai ADD COLUMN examples TEXT NOT NULL DEFAULT '[]'")
    print("已为存量库补充 examples 列")

upsert_sql = """
    INSERT INTO cipai (id, name, alias, charCount, sentences, formats, notes, examples, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))
    ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, alias = excluded.alias, charCount = excluded.charCount,
        sentences = excluded.sentences, formats = excluded.formats, notes = excluded.notes,
        examples = excluded.examples, updated_at = datetime('now','localtime')
"""
stmt = None  # 无需预编译，循环内直接 execute 带参执行

# 现库 name/alias → id 映射（避免同名词牌因 id 算法不同产生重复条目）
conn.row_factory = sqlite3.Row
db_rows = conn.execute("SELECT id, name, alias FROM cipai").fetchall()
conn.row_factory = None
name_to_db_id = {}
for r in db_rows:
    name_to_db_id.setdefault(r["name"], r["id"])
    try:
        for a in json.loads(r["alias"] or "[]"):
            name_to_db_id.setdefault(a, r["id"])
    except json.JSONDecodeError:
        pass

insert_n = update_n = 0
for c in data:
    # id 解析：龙 id 不存在时，按 name/alias 回退到现库 id（保持 id 稳定）
    cipai_id = c["id"]
    exists = conn.execute("SELECT 1 FROM cipai WHERE id = ?", (cipai_id,)).fetchone()
    if not exists and name_to_db_id.get(c["name"]):
        cipai_id = name_to_db_id[c["name"]]
        exists = conn.execute("SELECT 1 FROM cipai WHERE id = ?", (cipai_id,)).fetchone()
    row = (
        cipai_id,
        c["name"],
        json.dumps(c.get("alias") or [], ensure_ascii=False),
        c["charCount"],
        json.dumps(c["sentences"], ensure_ascii=False),
        json.dumps(c.get("formats") or [], ensure_ascii=False),
        c.get("notes") or "",
        json.dumps(c.get("examples") or [], ensure_ascii=False),
    )
    if DRY_RUN:
        if exists:
            update_n += 1
        else:
            insert_n += 1
        continue
    conn.execute(upsert_sql, row)
    if exists:
        update_n += 1
    else:
        insert_n += 1

if not DRY_RUN:
    conn.commit()
    print(f"导入完成: 新增 {insert_n} · 覆盖 {update_n}")
else:
    print(f"[dry] 将新增 {insert_n} · 将覆盖 {update_n}")

total = conn.execute("SELECT COUNT(*) FROM cipai").fetchone()[0]
print(f"数据库词牌总数: {total}")

if not DRY_RUN:
    with_formats = conn.execute(
        "SELECT COUNT(*) FROM cipai WHERE formats IS NOT NULL AND formats != '[]' AND formats != ''"
    ).fetchone()[0]
    print(f"含多格式数据词牌: {with_formats}")
    samples = conn.execute(
        "SELECT name, charCount, formats FROM cipai WHERE name IN ('临江仙','满江红','木兰花','十六字令')"
    ).fetchall()
    for name, cc, fmts in samples:
        print(f"  {name}: {cc}字 formats={len(json.loads(fmts or '[]'))}格")

conn.close()
