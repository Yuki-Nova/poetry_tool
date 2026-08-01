# -*- coding: utf-8 -*-
"""检查：仅龙榆生有的词牌 + 近似匹配"""
import json
import sqlite3

data = json.load(open('output/longyusheng_cipai_schema.json', encoding='utf-8'))
conn = sqlite3.connect('file:../server/data/cipai.db?mode=ro', uri=True)
names = [r[0] for r in conn.execute('SELECT name FROM cipai').fetchall()]
conn.close()

only_ly = [c['name'] for c in data if c['name'] not in names]
print('仅龙榆生有 (3):', only_ly)

for c in data:
    if c['name'] not in names:
        hit = [n for n in names if c['name'] in n or n in c['name']]
        if hit:
            print(f'  {c["name"]} ~ 近似匹配: {hit}')
