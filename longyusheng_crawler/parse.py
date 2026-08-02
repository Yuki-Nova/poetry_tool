# -*- coding: utf-8 -*-
"""解析器：html_cache/cipaiN.html → 结构化词牌 JSON

基于实测 HTML 结构（2026-08-01）：
- <h1 class="PageTitle"> 词牌名
- <meta name="keywords"> 词牌名+别名
- <div class="ItemTitle">【词牌名、别名】 + <div class="cipaiDesc"> 简介
- <a name="cpN"></a> <div class="ItemTitle">【定格】/【双调】/【又一体】 + <div class="ci"><blockquote>…
- 每 <div> 一句；span.ping=平、span.ze=仄、裸汉字=仄、span.zhong=中(可平可仄)
- span.yun0=（韵）标记韵脚（通用，不代表平/仄！韵脚平仄由字位判定）
- span.note〖〗=叠句标记（忽略）；<br class="empty">=分片点；<div class="Appendix">=注释
- 韵脚必在句尾：韵脚后若还有平仄字 → 拆句（如江城子"仄平平(韵)，仄平平(韵)"=两句）
"""

import json
import os
import re

from bs4 import BeautifulSoup

import config

# 韵脚标记 class 前缀（实测 yun0；兼容 yun1/yun2 等）
YUN_CLASS_RE = re.compile(r"yun\d*")

# meta keywords 中需剔除的噪声词
KEYWORD_NOISE = {"词牌", "格律", "唐宋词格律", "龙榆生", "电子书", "例词", "作者"}

# 页面底部例词变量：var ces = {'ce1': { t: 例词HTML, w: 作者, c: 词牌名, n: 注释, h: 链接 }, ...};
# 字段顺序固定 t,w,c,n,h；t 为 HTML（div 分行 + span 平仄标记），内容无裸单引号（已实测 153 页）
CES_BLOCK_RE = re.compile(r"var\s+ces\s*=\s*(\{.*?\});\s*(?:</script>|$)", re.S)
CES_ENTRY_RE = re.compile(
    r"'ce\d+':\s*\{\s*"
    r"t:\s*'((?:[^'\\]|\\.)*)'\s*,?"
    r"\s*w:\s*'((?:[^'\\]|\\.)*)'\s*,?"
    r"\s*c:\s*'((?:[^'\\]|\\.)*)'\s*,?"
    r"\s*n:\s*'((?:[^'\\]|\\.)*)'\s*,?"
    r"\s*h:\s*'((?:[^'\\]|\\.)*)'"
    r"\s*\}"
)


def parse_examples(html):
    """解析页面底部 `var ces` 例词变量 → 例词列表。

    每条例词清洗为纯文本（剥离 span/div 标签，保留作者与注释）：
      [{author, text, note}]
    例词 HTML 示例：<div><span class="ping">天</span>！</div>... →
      text = '天！休使圆蟾照客眠。人何在？桂影自婵娟。'
    """
    m = CES_BLOCK_RE.search(html)
    if not m:
        return []
    examples = []
    for ent in CES_ENTRY_RE.finditer(m.group(1)):
        t_html, author, _cipai_name, note, _href = ent.groups()
        # 清洗：去标签保留文本，去除空白（词句间无空格）
        soup = BeautifulSoup(t_html, "lxml")
        text = re.sub(r"\s+", "", soup.get_text("", strip=False))
        if not text:
            continue
        examples.append({
            "author": author.strip(),
            "text": text,
            "note": note.strip(),
        })
    return examples


def parse_detail(cid, html, catalog_item=None):
    """解析单个词牌页 → dict（含 formats 原始结构与首格式的 sentences 视图）。"""
    soup = BeautifulSoup(html, "lxml")

    # ── 词牌名 ──
    title_el = soup.find("h1", class_="PageTitle")
    name = title_el.get_text(strip=True) if title_el else None
    if not name:
        return None

    # ── 别名（keywords meta：从第 1 个词到"词牌"噪声前）──
    alias = []
    kw_meta = soup.find("meta", attrs={"name": "keywords"})
    if kw_meta and kw_meta.get("content"):
        parts = [p.strip() for p in kw_meta["content"].split(",")]
        for p in parts:
            if not p or p in KEYWORD_NOISE:
                break
            if p != name and p not in alias:
                alias.append(p)

    # ── 简介 + 注释 ──
    desc_el = soup.find("div", class_="cipaiDesc")
    desc_text = desc_el.get_text(" ", strip=True) if desc_el else ""

    notes_parts = []
    if desc_text:
        notes_parts.append(desc_text)
    app_el = soup.find("div", class_="Appendix")
    if app_el:
        notes_parts.append(app_el.get_text(" ", strip=True))

    # ── 格式列表 ──
    formats = []
    ci_blocks = soup.find_all("div", class_="ci")
    for ci in ci_blocks:
        # 格式标题：ci 之前的最近 ItemTitle
        item_title = ci.find_previous("div", class_="ItemTitle")
        format_label = ""
        if item_title:
            m = re.match(r"【(.+?)】", item_title.get_text(strip=True))
            if m:
                format_label = m.group(1)

        blockquote = ci.find("blockquote")
        if not blockquote:
            continue

        # 按 <br class="empty"> 分片；片段内每个 <div> 是一行（可能含多句）
        plan_segments = split_by_br_empty(blockquote)
        sentences = []
        for seg_idx, seg in enumerate(plan_segments):
            # BeautifulSoup 容器根为 html>body，需递归查找 div（页内无嵌套 div）
            for div in seg.find_all("div"):
                tokens = tokenize_line(div)
                sentences.extend(split_by_rhyme(tokens))

        if not sentences:
            continue

        formats.append({
            "label": format_label or "未命名格式",
            "planSegments": len(plan_segments),  # 分片数（1=单调，2=双调…）
            "sentences": sentences,
            "notes": "",  # 格式级注释（如有，后续可补充）
        })

    if not formats:
        return None

    # ── 例词（页面底部 var ces 变量）──
    examples = parse_examples(html)

    # ── 韵格分类（目录页提供）──
    category = catalog_item.get("category") if catalog_item else None

    return {
        "id": cid,
        "name": name,
        "alias": alias,
        "category": category,
        "notes": "；".join(notes_parts),
        "formats": formats,
        "examples": examples,
    }


def split_by_br_empty(blockquote):
    """按 <br class="empty"> 把 blockquote 切成多个片；无分片标记则返回单元素列表。
    每个片是一个 BeautifulSoup 容器（含全部 <div> 句子行）。
    """
    segments = [[]]
    for child in blockquote.children:
        if getattr(child, "name", None) == "br" and "empty" in (child.get("class") or []):
            segments.append([])
        else:
            segments[-1].append(child)
    return [BeautifulSoup("".join(str(c) for c in seg), "lxml")
            for seg in segments if any(getattr(c, "name", None) == "div" for c in seg)]


def tokenize_line(div):
    """把一行 div 转成 token 流：
    - char: {'t':'char','tone': 平/仄/可平可仄}（span.ping*/ze*/zhong 及裸字按字面 平/仄/中）
    - rhyme: {'t':'rhyme'}（span.yun* → 韵脚标记）
    - break: {'t':'break'}（逗号/句号 → 句界）
    裸汉字按字面含义解析（格律谱符号本身），标点只认句界。
    注意：源站有 class 变体 ze/ze2/ze3、ping/ping2（下半阕颜色差异），
    用前缀正则匹配（^ze\d*$ / ^ping\d*$）而非精确等于，避免丢字。
    """
    tokens = []
    for node in div.descendants:
        if isinstance(node, str):
            text = str(node)
            # span 内文本由 span 处理；裸文本按字面解析
            parent_span = getattr(node, "parent", None)
            if getattr(parent_span, "name", None) == "span":
                continue
            for ch in text:
                if ch == "平":
                    tokens.append({"t": "char", "tone": "平"})
                elif ch == "仄":
                    tokens.append({"t": "char", "tone": "仄"})
                elif ch == "中":
                    tokens.append({"t": "char", "tone": "可平可仄"})
                elif ch in "，。；、！？":
                    tokens.append({"t": "break"})
            continue

        if getattr(node, "name", None) != "span":
            continue
        cls = node.get("class") or []
        cls_set = set(cls)
        if any(re.fullmatch(r"ping\d*", c) for c in cls):
            tokens.append({"t": "char", "tone": "平"})
        elif any(re.fullmatch(r"ze\d*", c) for c in cls):
            tokens.append({"t": "char", "tone": "仄"})
        elif "zhong" in cls_set:
            tokens.append({"t": "char", "tone": "可平可仄"})
        elif any(YUN_CLASS_RE.match(c) for c in cls):
            tokens.append({"t": "rhyme"})
        # note（〖〗叠句）、mark/lingge/duiou 等其他装饰 → 忽略
    return tokens


def split_by_rhyme(tokens):
    """按句界拆句：韵脚必在句尾；break token（逗号/句号）即句界；韵脚后遇新字也拆句。
    返回 sentences: [{length, pattern[], isRhyme, rhymeType}]
    """
    sentences = []
    cur = []          # 当前句字符 token
    cur_rhyme = False  # 当前句是否有韵脚
    expect_new = False  # 韵脚后遇到新字 → 先提交当前句

    def flush():
        nonlocal cur, cur_rhyme
        if not cur:
            cur_rhyme = False
            return
        last = cur[-1]
        tone = last["tone"]
        rhyme_type = None
        if cur_rhyme:
            rhyme_type = {"平": "平韵", "仄": "仄韵", "可平可仄": "可平可仄"}.get(tone, "可平可仄")
        sentences.append({
            "length": len(cur),
            "pattern": [t["tone"] for t in cur],
            "isRhyme": cur_rhyme,
            "rhymeType": rhyme_type,
        })
        cur = []
        cur_rhyme = False

    for tk in tokens:
        if tk["t"] == "char":
            if expect_new:
                flush()
                expect_new = False
            cur.append(tk)
        elif tk["t"] == "rhyme":
            if cur:
                cur_rhyme = True
                expect_new = True  # 韵脚后可能有下一句（同一 div 内连排短句）
        elif tk["t"] == "break":
            flush()
            expect_new = False
    flush()
    return sentences


def load_catalog():
    if not os.path.exists(config.CATALOG_JSON):
        return None
    with open(config.CATALOG_JSON, encoding="utf-8") as f:
        return json.load(f)


def main():
    catalog = load_catalog()
    if not catalog:
        print("⚠ 未找到 catalog（先运行 fetch.py）")
        return

    results = []
    warnings = []
    for it in catalog:
        cid = it["id"]
        path = os.path.join(config.HTML_CACHE_DIR, f"cipai{cid}.html")
        if not os.path.exists(path):
            warnings.append(f"缺缓存: cipai{cid}.html")
            continue
        with open(path, encoding="utf-8") as f:
            html = f.read()
        parsed = parse_detail(cid, html, it)
        if not parsed:
            warnings.append(f"解析失败: cipai{cid}.html（{it['name']}）")
            continue

        # 解析质量自检
        first = parsed["formats"][0]
        if not first["sentences"]:
            warnings.append(f"无句子: {parsed['name']}({cid})")
        rhyme_cnt = sum(1 for s in first["sentences"] if s["isRhyme"])
        if rhyme_cnt == 0:
            warnings.append(f"无韵脚: {parsed['name']}({cid})")

        results.append(parsed)

    results.sort(key=lambda x: x["id"])
    with open(config.CIPAI_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"解析完成: {len(results)} 个词牌 → {config.CIPAI_JSON}")
    if warnings:
        print(f"⚠ 警告 {len(warnings)} 条:")
        for w in warnings:
            print(f"  - {w}")
    else:
        print("无警告 ✅")

    # 统计
    multi = [r["name"] for r in results if len(r["formats"]) > 1]
    print(f"多格式词牌: {len(multi)} 个（{', '.join(multi[:10])}{'…' if len(multi) > 10 else ''}）")

    # 例词统计
    with_examples = [r for r in results if r.get("examples")]
    total_ex = sum(len(r.get("examples", [])) for r in results)
    print(f"例词: {len(with_examples)} 个词牌含例词，共 {total_ex} 条例词（无例词: {len(results) - len(with_examples)}）")


if __name__ == "__main__":
    main()
