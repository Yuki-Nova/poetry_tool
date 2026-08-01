# -*- coding: utf-8 -*-
"""检查临江仙变体展开结果"""
import json

data = json.load(open('output/longyusheng_cipai_schema.json', encoding='utf-8'))
ljx = [c for c in data if c['name'].startswith('临江仙')]
for c in sorted(ljx, key=lambda x: x['id']):
    print(f"{c['id']:30s} {c['name']:22s} {c['charCount']}字 {len(c['sentences'])}句 "
          f"variantOf={c['variantOf']} fmt={c['sourceFormat']}")
