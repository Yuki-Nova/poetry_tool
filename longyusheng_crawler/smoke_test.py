# -*- coding: utf-8 -*-
"""单页解析冒烟测试：验证解析器对实测页面的输出"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config
from fetch import fetch_detail
from parse import parse_detail

for cid, expect_name in [(1, "十六字令"), (10, "江城子"), (54, "如梦令")]:
    html = fetch_detail(cid)
    assert html, f"抓取失败 cipai{cid}"
    parsed = parse_detail(cid, html, {"category": "测试", "id": cid, "name": expect_name})
    assert parsed, f"解析失败 cipai{cid}"
    print(f"\n===== {parsed['name']} (cipai{cid}) 类别={parsed['category']} =====")
    print(f"别名: {parsed['alias']}")
    print(f"格式数: {len(parsed['formats'])}")
    for fmt in parsed['formats']:
        print(f"  [{fmt['label']}] 分片={fmt['planSegments']} 句数={len(fmt['sentences'])}")
        for s in fmt['sentences']:
            mark = "韵" if s['isRhyme'] else " "
            print(f"    {mark} {''.join({'平':'平','仄':'仄','可平可仄':'中'}[t] for t in s['pattern'])}  ({s['rhymeType'] or ''})")
    print(f"notes: {parsed['notes'][:100]}…")

print("\n冒烟测试通过 ✅")
