# -*- coding: utf-8 -*-
"""展示临江仙 4 个格的平仄差异（验证变体解析）"""
import json

data = json.load(open('output/longyusheng_cipai.json', encoding='utf-8'))
ljx = [d for d in data if d['name'] == '临江仙'][0]

print(f"临江仙：{len(ljx['formats'])} 个格式\n")
for fi, fmt in enumerate(ljx['formats']):
    print(f"【{fmt['label']}】{len(fmt['sentences'])}句/{sum(s['length'] for s in fmt['sentences'])}字 分片={fmt['planSegments']}")
    for s in fmt['sentences']:
        mark = '韵' if s['isRhyme'] else ' '
        pat = ''.join({'平': '平', '仄': '仄', '可平可仄': '中'}[t] for t in s['pattern'])
        print(f"  {mark} {pat} ({s['rhymeType'] or '-'})")
    print()

# 格一 vs 格二 vs 格三 pattern 是否不同
def sig(fmt):
    return [tuple(s['pattern']) for s in fmt['sentences']]

f1, f2, f3 = ljx['formats'][0], ljx['formats'][1], ljx['formats'][2]
print("格一 vs 格二 平仄相同:", sig(f1) == sig(f2))
print("格一 vs 格三 平仄相同:", sig(f1) == sig(f3))
