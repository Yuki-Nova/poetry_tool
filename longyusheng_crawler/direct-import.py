# -*- coding: utf-8 -*-
"""龙榆生词牌数据直写导入脚本（幂等 upsert，Python 标准库 sqlite3，零依赖）

用法：
  python direct-import.py [--dry]
  --dry  试运行：只统计将要执行的变更，不写入

行为：
  - id 已存在 → UPDATE 覆盖（name/alias/charCount/sentences/formats/notes/examples）
  - id 不存在 → INSERT 新增
  - 导入前自动备份 cipai.db → cipai.db.<timestamp>.bak
  - **导入门禁（P0）**：导入前全量校验（cipai_validator，规则与 shared/cipaiSchema.js 等价），
    任一失败 → 阻断并列出全部错误，不写库（幂等导入：一条错说明管道有系统性问题，应修源）
  - **corrections（P0）**：爬虫数据 upsert 后，应用 corrections.json（手工修正唯一出口，
    版本化、可追溯、永不被重导覆盖）。修正合并后同样过校验，失败则跳过并告警。
"""

import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime

from cipai_validator import validate_cipai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# 路径可用环境变量覆盖（测试/临时库场景），默认指向真实库
DB_PATH = os.environ.get("CIPAI_DB_PATH") or os.path.normpath(os.path.join(BASE_DIR, "..", "server", "data", "cipai.db"))
JSON_PATH = os.environ.get("CIPAI_JSON_PATH") or os.path.join(BASE_DIR, "output", "longyusheng_cipai_schema.json")
CORRECTIONS_PATH = os.environ.get("CIPAI_CORRECTIONS_PATH") or os.path.join(BASE_DIR, "corrections.json")

DRY_RUN = "--dry" in sys.argv

if not os.path.exists(DB_PATH):
    print("未找到 cipai.db:", DB_PATH)
    sys.exit(1)
if not os.path.exists(JSON_PATH):
    print("未找到导入数据:", JSON_PATH)
    sys.exit(1)

# ── 加载爬虫数据并全量门禁校验（dry-run 同样校验）──
with open(JSON_PATH, encoding="utf-8") as f:
    data = json.load(f)

gate_failures = 0
for c in data:
    result = validate_cipai(c)
    if not result["valid"]:
        gate_failures += 1
        print(f"✗ 门禁失败 [{c.get('id')} / {c.get('name')}]:")
        for e in result["errors"]:
            print(f"    - {e}")
if gate_failures > 0:
    print(f"\n门禁未通过: {gate_failures} 条数据存在错误，导入已阻断（请修复数据源或写 corrections）")
    sys.exit(2)

# ── 加载 corrections.json（可选）──
corrections = []
if os.path.exists(CORRECTIONS_PATH):
    with open(CORRECTIONS_PATH, encoding="utf-8-sig") as f:  # utf-8-sig: Windows 编辑器可能存 BOM
        raw = json.load(f)
    if not isinstance(raw, list):
        print("⚠ corrections.json 顶层须为数组（[{id, patch}, ...]），已忽略")
        raw = []
    corrections = [r for r in raw if isinstance(r, dict) and r.get("id") and isinstance(r.get("patch"), dict)]
    skipped = len(raw) - len(corrections)
    if skipped:
        print(f"⚠ corrections.json 忽略 {skipped} 条格式不合法条目")

# ── 备份 ──
if not DRY_RUN:
    ts = datetime.now().strftime("%Y%m%d%H%M%S")
    bak = os.path.join(os.path.dirname(DB_PATH), f"cipai.db.{ts}.bak")
    shutil.copy2(DB_PATH, bak)
    print(f"已备份 → {bak}")

conn = sqlite3.connect(DB_PATH)
conn.execute("PRAGMA journal_mode = WAL")
conn.execute("PRAGMA foreign_keys = ON")

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

# ── 应用 corrections（覆盖式修正，在爬虫数据之后）──
corr_ok = corr_skip = 0
if corrections:
    conn.row_factory = sqlite3.Row
    for cr in corrections:
        cid = cr["id"]
        patch = cr["patch"]
        cur = conn.execute("SELECT * FROM cipai WHERE id = ?", (cid,)).fetchone()
        if not cur:
            print(f"⚠ corrections 未找到 id {cid}，跳过")
            corr_skip += 1
            continue
        merged = {
            "id": cid,
            "name": patch.get("name", cur["name"]),
            "alias": patch.get("alias", json.loads(cur["alias"] or "[]")),
            "charCount": patch.get("charCount", cur["charCount"]),
            "sentences": patch.get("sentences", json.loads(cur["sentences"] or "[]")),
            "formats": patch.get("formats", json.loads(cur["formats"] or "[]")),
            "notes": patch.get("notes", cur["notes"] or ""),
            "examples": patch.get("examples", json.loads(cur["examples"] or "[]")),
        }
        result = validate_cipai(merged)
        if not result["valid"]:
            print(f"⚠ corrections {cid} 合并后校验失败，跳过: {result['errors'][:3]}")
            corr_skip += 1
            continue
        if DRY_RUN:
            corr_ok += 1
            continue
        conn.execute(
            """UPDATE cipai SET name=?, alias=?, charCount=?, sentences=?, formats=?,
               notes=?, examples=?, updated_at=datetime('now','localtime') WHERE id=?""",
            (
                merged["name"],
                json.dumps(merged["alias"], ensure_ascii=False),
                merged["charCount"],
                json.dumps(merged["sentences"], ensure_ascii=False),
                json.dumps(merged["formats"], ensure_ascii=False),
                merged["notes"],
                json.dumps(merged["examples"], ensure_ascii=False),
                cid,
            ),
        )
        corr_ok += 1
    conn.row_factory = None

if not DRY_RUN:
    conn.commit()
    print(f"导入完成: 新增 {insert_n} · 覆盖 {update_n}")
    if corrections:
        print(f"corrections 应用: {corr_ok} 条生效 · {corr_skip} 条跳过")
else:
    print(f"[dry] 将新增 {insert_n} · 将覆盖 {update_n}")
    if corrections:
        print(f"[dry] corrections 将应用 {corr_ok} 条 · 跳过 {corr_skip} 条")

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
