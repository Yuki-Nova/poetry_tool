# -*- coding: utf-8 -*-
"""cipai_validator.py — 词牌数据校验（Python 版，规则与 shared/cipaiSchema.js 语义等价）

背景：direct-import.py 与 export-static.py 都是 Python stdlib 零依赖脚本，
无法直接 import JS 的 validateCipai，故在此等价重写同一套规则。
任何对 shared/cipaiSchema.js 的规则修改，必须同步本文件（反之亦然）。

与 JS 版差异（刻意保留，勿对齐）：
  - JS 版 charCount 校验仅在 `cipai.charCount` 为真值（非空非 0）时触发，Python 版同语义。
  - JS 版 formats 校验允许 formats 为 undefined/null；Python 版用 key 是否存在判断。
"""

TONE_VALUES = {"平", "仄", "可平可仄", "韵脚"}
RHYME_TYPES = {"平韵", "仄韵", "可平可仄"}


def validate_sentences(sentences, errors, prefix):
    """校验单个格式的句子数组（与顶层 sentences 同一套规则）。"""
    if not isinstance(sentences, list) or len(sentences) == 0:
        errors.append(f"{prefix}：至少需要一句格律定义")
        return
    for i, s in enumerate(sentences):
        if not isinstance(s, dict):
            errors.append(f"{prefix} 句 {i}: 须为对象")
            continue
        if s.get("index") != i:
            errors.append(f"{prefix} 句 {i}: index 应为 {i}，实际 {s.get('index')}")
        length = s.get("length")
        if not length or length < 1:
            errors.append(f"{prefix} 句 {i}: length 至少为 1")
        pattern = s.get("pattern")
        if not isinstance(pattern, list) or len(pattern) != length:
            got = len(pattern) if isinstance(pattern, list) else "?"
            errors.append(f"{prefix} 句 {i}: pattern 数组长度 ({got}) 与 length ({length}) 不匹配")
        else:
            for j, t in enumerate(pattern):
                if t not in TONE_VALUES:
                    errors.append(f"{prefix} 句 {i} 字 {j}: 非法格律值 {t!r}，合法值: {' / '.join(sorted(TONE_VALUES))}")
        if not isinstance(s.get("isRhyme"), bool):
            errors.append(f"{prefix} 句 {i}: isRhyme 须为布尔值")
        if s.get("isRhyme") and s.get("rhymeType") and s["rhymeType"] not in RHYME_TYPES:
            errors.append(f"{prefix} 句 {i}: 非法 rhymeType {s['rhymeType']!r}，合法值: {' / '.join(RHYME_TYPES)}")


def validate_cipai(cipai):
    """校验词牌数据合法性，返回 {'valid': bool, 'errors': [str]}。"""
    import re

    errors = []
    if not isinstance(cipai, dict):
        return {"valid": False, "errors": ["数据不能为空"]}

    # id: 必填，字母数字下划线连字符，以字母开头
    cid = cipai.get("id")
    if not cid or not re.fullmatch(r"[a-z][a-z0-9_-]*", cid, re.IGNORECASE):
        errors.append("id 必填，须以字母开头，仅含字母数字下划线连字符")

    # name: 必填
    if not cipai.get("name") or not str(cipai["name"]).strip():
        errors.append("词牌名 name 必填")

    # alias: 须为数组
    if cipai.get("alias") is not None and not isinstance(cipai["alias"], list):
        errors.append("alias 须为字符串数组")

    # sentences: 必填，至少一句
    total_chars = 0
    sentences = cipai.get("sentences")
    if not isinstance(sentences, list) or len(sentences) == 0:
        errors.append("至少需要一句格律定义")
    else:
        for i, s in enumerate(sentences):
            if not isinstance(s, dict):
                errors.append(f"句 {i}: 须为对象")
                continue
            if s.get("index") != i:
                errors.append(f"句 {i}: index 应为 {i}，实际 {s.get('index')}")
            length = s.get("length")
            if not length or length < 1:
                errors.append(f"句 {i}: length 至少为 1")
            pattern = s.get("pattern")
            if not isinstance(pattern, list) or len(pattern) != length:
                got = len(pattern) if isinstance(pattern, list) else "?"
                errors.append(f"句 {i}: pattern 数组长度 ({got}) 与 length ({length}) 不匹配")
            else:
                for j, t in enumerate(pattern):
                    if t not in TONE_VALUES:
                        errors.append(f"句 {i} 字 {j}: 非法格律值 {t!r}，合法值: {' / '.join(sorted(TONE_VALUES))}")
            if not isinstance(s.get("isRhyme"), bool):
                errors.append(f"句 {i}: isRhyme 须为布尔值")
            if s.get("isRhyme") and s.get("rhymeType") and s["rhymeType"] not in RHYME_TYPES:
                errors.append(f"句 {i}: 非法 rhymeType {s['rhymeType']!r}，合法值: {' / '.join(RHYME_TYPES)}")
            total_chars += length or 0

        if cipai.get("charCount") and cipai["charCount"] != total_chars:
            errors.append(f"charCount ({cipai['charCount']}) 与所有句子长度之和 ({total_chars}) 不一致")

    # formats: 可选；存在时校验每个格式的 sentences，并核对 formats[0] 与顶层一致
    if "formats" in cipai and cipai["formats"] is not None:
        formats = cipai["formats"]
        if not isinstance(formats, list) or len(formats) == 0:
            errors.append("formats 须为非空数组（可为空数组，表示单格式）")
        else:
            for fi, f in enumerate(formats):
                prefix = f"格式 {fi}" + (f"（{f['label']}）" if isinstance(f, dict) and f.get("label") else "")
                if not isinstance(f, dict):
                    errors.append(f"{prefix}: 格式项须为对象")
                    continue
                if f.get("label") is not None and not isinstance(f["label"], str):
                    errors.append(f"{prefix}: label 须为字符串")
                validate_sentences(f.get("sentences"), errors, prefix)
            # formats[0] 与顶层一致性
            main = cipai.get("sentences")
            f0 = formats[0].get("sentences") if isinstance(formats[0], dict) else None
            if (isinstance(main, list) and len(main) > 0
                    and isinstance(f0, list) and len(f0) > 0):
                def _sig(sents):
                    return "|".join(f"{s.get('length')}:{''.join(s.get('pattern') or [])}:{1 if s.get('isRhyme') else 0}" for s in sents)
                if _sig(main) != _sig(f0):
                    errors.append("formats[0]（主格式）与顶层 sentences 不一致")

    # examples: 可选；校验每项 {author, text, note}
    if "examples" in cipai and cipai["examples"] is not None:
        examples = cipai["examples"]
        if not isinstance(examples, list):
            errors.append("examples 须为数组")
        else:
            for i, ex in enumerate(examples):
                if not isinstance(ex, dict):
                    errors.append(f"例词 {i}: 例词项须为对象")
                    continue
                if ex.get("author") is not None and not isinstance(ex["author"], str):
                    errors.append(f"例词 {i}: author 须为字符串")
                if not isinstance(ex.get("text"), str) or not ex["text"].strip():
                    errors.append(f"例词 {i}: text 必填且须为字符串")
                if ex.get("note") is not None and not isinstance(ex["note"], str):
                    errors.append(f"例词 {i}: note 须为字符串")

    return {"valid": len(errors) == 0, "errors": errors}


if __name__ == "__main__":
    # 自检：空对象 + 一个合法骨架
    print(validate_cipai({}))
    print(validate_cipai({
        "id": "test", "name": "测试", "alias": [], "charCount": 1,
        "sentences": [{"index": 0, "length": 1, "pattern": ["平"], "isRhyme": False, "rhymeType": None}],
        "formats": [], "notes": "", "examples": [],
    }))
