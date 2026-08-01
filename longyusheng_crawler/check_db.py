# -*- coding: utf-8 -*-
"""快速检查 cipai.db 现状（只读）"""
import json
import sqlite3

conn = sqlite3.connect('file:server/data/cipai.db?mode=ro', uri=True)
conn.row_factory = sqlite3.Row
rows = conn.execute('SELECT COUNT(*) as c FROM cipai').fetchone()
print('现库词牌数:', rows['c'])

sample = conn.execute(
    "SELECT name, charCount, sentences FROM cipai WHERE name IN ('江城子','如梦令','十六字令')"
).fetchall()
for r in sample:
    s = json.loads(r['sentences'])
    print(r['name'], r['charCount'], '字', '句数:', len(s),
          '首句:', s[0]['pattern'] if s else 'N/A')
conn.close()
