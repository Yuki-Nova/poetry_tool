# -*- coding: utf-8 -*-
"""列出龙榆生数据中所有含多个格式变体的词牌"""
import json

data = json.load(open('output/longyusheng_cipai.json', encoding='utf-8'))

multi = [d for d in data if len(d['formats']) > 1]
print(f"共 {len(multi)} 个词牌有多格式变体（总 153）\n")

for d in sorted(multi, key=lambda x: x['name']):
    labels = [f"{f['label']}({len(f['sentences'])}句/{sum(s['length'] for s in f['sentences'])}字)"
              for f in d['formats']]
    print(f"{d['name']}: {' → '.join(labels)}")

# 变体标签统计
from collections import Counter
label_counter = Counter()
for d in multi:
    for f in d['formats']:
        label_counter[f['label']] += 1
print("\n变体标签统计:")
for k, v in label_counter.most_common():
    print(f"  {k}: {v}")
