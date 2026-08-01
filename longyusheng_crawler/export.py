# -*- coding: utf-8 -*-
"""导出器：longyusheng_cipai.json → cipaiSchema 兼容格式

多格式选择策略（计划 M2 定稿）：
1. 【双调】优先（宋词常用形态）
2. 否则【定格】
3. 否则第一个
其余格式保留在 extraFormats 供人工参考。

id 生成：与 scripts/import-cipai.js 的 NAME_TO_ID 映射 + 中文 hash 回退一致，
保证同名词牌 id 与现库相同 → 导入即为更新。
"""

import hashlib
import json
import os

import config

# 与 scripts/import-cipai.js 相同的预定义 ID 映射（关键常见词牌）
NAME_TO_ID = {
    '竹枝': 'zhuzhi', '归字谣': 'guiziyao', '渔父引': 'yufuyin', '閒中好': 'xianzhonghao',
    '纥那曲': 'genaqu', '拜新月': 'baixinyue', '梧桐影': 'wutongying', '啰唝曲': 'luohongqu',
    '醉妆词': 'zuizhuangci', '庆宣和': 'qingxuanhe', '南歌子': 'nangezi', '回波乐': 'huiboyue',
    '舞马词': 'wumaci', '三台': 'santai', '柘枝引': 'zhezhiyin', '凭阑人': 'pinglanren',
    '摘得新': 'zhaidexin', '渔歌子': 'yugezi', '忆江南': 'yijiangnan', '潇湘神': 'xiaoxiangshen',
    '解红': 'jiehong', '赤枣子': 'chizaozi', '捣练子': 'daolianzi', '桂殿秋': 'guidianqiu',
    '满江红': 'manjianghong', '蝶恋花': 'dielianhua', '菩萨蛮': 'pusaman', '西江月': 'xijiangyue',
    '浣溪沙': 'huanxisha', '鹧鸪天': 'zhegutian', '念奴娇': 'niannujiao', '水调歌头': 'shuidiaogetou',
    '临江仙': 'linjiangxian', '虞美人': 'yumeiren', '如梦令': 'rumengling', '点绛唇': 'dianjiangchun',
    '清平乐': 'qingpingyue', '卜算子': 'busuanzi', '采桑子': 'caisangzi', '浪淘沙': 'langtaosha',
    '江城子': 'jiangchengzi', '沁园春': 'qinyuanchun', '永遇乐': 'yongyule', '雨霖铃': 'yulinling',
    '声声慢': 'shengshengman', '一剪梅': 'yijianmei', '定风波': 'dingfengbo', '渔家傲': 'yujiaao',
    '踏莎行': 'tasuoxing', '苏幕遮': 'sumuzhe', '破阵子': 'pozhenzi', '青玉案': 'qingyuanan',
    '十六字令': 'shiliuziling', '苍梧谣': 'cangwuyao', '南乡子': 'nanxiangzi', '长相思': 'changxiangsi',
    '鹧鸪天': 'zhegutian', '小重山': 'xiaochongshan', '唐多令': 'tangduoling', '行香子': 'xingxiangzi',
    '风入松': 'fengrusong', '八声甘州': 'bashengganzhou', '望海潮': 'wanghaichao', '扬州慢': 'yangzhouman',
    '高阳台': 'gaoyangtai', '暗香': 'anxiang', '疏影': 'shuying', '摸鱼儿': 'moyuer',
    '贺新郎': 'hexinlang', '兰陵王': 'lanlingwang', '六丑': 'liuchou', '莺啼序': 'yingtixu',
    '忆王孙': 'yiwangsun', '忆秦娥': 'yiqine', '调笑令': 'tiaoxiaoling', '昭君怨': 'zhaojunyuan',
    '醉花阴': 'zuihuayin', '鹊桥仙': 'queqiaoxian', '虞美人': 'yumeiren', '南歌子': 'nangezi',
}


def to_id(name):
    """与 import-cipai.js 相同的 ID 生成（NAME_TO_ID 映射 + 字符码 36 进制 hash 回退）
    JS: name.charCodeAt(i).toString(36) → Python 模拟
    """
    if name in NAME_TO_ID:
        return NAME_TO_ID[name]

    def to_base36(n):
        if n == 0:
            return '0'
        digits = '0123456789abcdefghijklmnopqrstuvwxyz'
        out = ''
        while n > 0:
            out = digits[n % 36] + out
            n //= 36
        return out

    h = 'ci'
    for ch in name[:6]:
        h += to_base36(ord(ch))
    return h[:30]


def build_cipai(parsed):
    """龙榆生解析结果 → 单条目多格式词牌对象。

    1 个词牌 1 个 ID（对应词牌名），全部格式进入 formats 数组：
    - 顶层 sentences = formats[0].sentences（主格式冗余，兼容旧代码）
    - formats[i] = { label, planSegments, sentences }
    """
    formats = []
    for fmt in parsed["formats"]:
        sentences = []
        for i, s in enumerate(fmt["sentences"]):
            sentences.append({
                "index": i,
                "length": s["length"],
                "pattern": s["pattern"],
                "isRhyme": s["isRhyme"],
                "rhymeType": s["rhymeType"],
            })
        formats.append({
            "label": fmt["label"],
            "planSegments": fmt.get("planSegments", 1),
            "sentences": sentences,
        })

    # 同名格式去重（如满江红两个「变格」→ 变格二）
    used_labels = {}
    for fmt in formats:
        label = fmt["label"]
        if label in used_labels:
            CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
            used_labels[label] += 1
            seq = used_labels[label]
            fmt["label"] = label + (CN_NUM[seq] if seq < 10 else str(seq))
        else:
            used_labels[label] = 1

    main_sentences = formats[0]["sentences"]
    char_count = sum(s["length"] for s in main_sentences)

    name = parsed["name"]
    notes_parts = [f"龙榆生《唐宋词格律》"]
    if parsed.get("category"):
        notes_parts.append(f"韵格:{parsed['category']}")
    if parsed.get("notes"):
        notes_parts.append(parsed["notes"])

    # 例词：词牌级（龙榆生页面例词未标注对应格式，故挂在词牌下）
    examples = []
    for ex in parsed.get("examples") or []:
        examples.append({
            "author": ex.get("author", ""),
            "text": ex.get("text", ""),
            "note": ex.get("note", ""),
        })

    return {
        "id": to_id(name),
        "name": name,
        "alias": parsed.get("alias") or [],
        "charCount": char_count,
        "sentences": main_sentences,
        "formats": formats,
        "notes": "；".join(notes_parts),
        "category": parsed.get("category"),
        "examples": examples,
    }


def main():
    with open(config.CIPAI_JSON, encoding="utf-8") as f:
        parsed_list = json.load(f)

    cipai_list = [build_cipai(p) for p in parsed_list]

    out_path = os.path.join(config.OUTPUT_DIR, "longyusheng_cipai_schema.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(cipai_list, f, ensure_ascii=False, indent=2)

    # 统计
    multi = [c for c in cipai_list if len(c["formats"]) > 1]
    print(f"导出 {len(cipai_list)} 个词牌条目（1 词牌 1 ID）→ {out_path}")
    print(f"  多格式词牌: {len(multi)} 个")
    if multi:
        top = sorted(multi, key=lambda c: len(c["formats"]), reverse=True)[:8]
        print("  变体最多: " + ", ".join(f"{c['name']}({len(c['formats'])}格)" for c in top))
    with_ex = [c for c in cipai_list if c.get("examples")]
    total_ex = sum(len(c.get("examples") or []) for c in cipai_list)
    print(f"  例词: {len(with_ex)} 个词牌含例词，共 {total_ex} 条")

    # 重复 id / 重名检查
    ids = [c["id"] for c in cipai_list]
    dup_id = {i for i in ids if ids.count(i) > 1}
    if dup_id:
        print(f"⚠ 重复 id: {dup_id}")
    names = [c["name"] for c in cipai_list]
    dup_name = {n for n in names if names.count(n) > 1}
    if dup_name:
        print(f"⚠ 重复 name: {dup_name}")


if __name__ == "__main__":
    main()
