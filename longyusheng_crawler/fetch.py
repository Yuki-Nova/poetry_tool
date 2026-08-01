# -*- coding: utf-8 -*-
"""抓取器：目录页 + 153 个词牌详情页 → output/html_cache/

特性：
- GB2312 显式解码（requests 的 apparent_encoding 不可靠）
- 断点续爬：html_cache 已有文件则跳过
- 限速 1.5s/页、失败重试 3 次（指数退避）
- 目录解析：词牌列表 + 韵格分类（平韵格/仄韵格/…）
"""

import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

import config


def get(url, *, retries=config.MAX_RETRY):
    """GET 并解码为 GB2312 文本；失败重试指数退避。"""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=config.HEADERS, timeout=config.TIMEOUT)
            resp.raise_for_status()
            return resp.content.decode("gb2312", errors="replace")
        except Exception as e:
            wait = config.RETRY_BACKOFF * (2 ** attempt)
            print(f"  ⚠ {url} 第 {attempt+1}/{retries} 次失败: {e}（等待 {wait}s）")
            if attempt < retries - 1:
                time.sleep(wait)
    return None


def fetch_catalog():
    """抓取目录页并解析：返回 {id, name, category} 列表。"""
    html = get(config.CIPAI_MULU)
    if not html:
        raise RuntimeError("目录页抓取失败")
    soup = BeautifulSoup(html, "lxml")

    items = []
    current_cat = None
    for el in soup.find_all(["h1", "h2", "h3", "a"]):
        if el.name in ("h1", "h2", "h3"):
            text = el.get_text(strip=True)
            if text in config.CATEGORY_NAMES:
                current_cat = text
            continue
        href = el.get("href") or ""
        m = re.search(r"cipai(\d+)\.html", href)
        if m:
            cid = int(m.group(1))
            name = el.get_text(strip=True)
            if name and 1 <= cid <= config.CIPAI_ID_RANGE[1]:
                items.append({"id": cid, "name": name, "category": current_cat or "未分类"})

    # 去重保序
    seen = set()
    unique = []
    for it in items:
        if it["id"] not in seen:
            seen.add(it["id"])
            unique.append(it)
    return unique


def fetch_detail(cid):
    """抓取单个词牌详情页；返回 HTML 文本或 None（缓存命中/失败）。"""
    cache_path = os.path.join(config.HTML_CACHE_DIR, f"cipai{cid}.html")
    if os.path.exists(cache_path):
        with open(cache_path, "r", encoding="utf-8") as f:
            return f.read()

    url = config.CIPAI_DETAIL.format(cid)
    html = get(url)
    if html is None:
        return None
    # 缓存（统一存为 utf-8，原始编码信息丢失无妨——已解码为文本）
    os.makedirs(config.HTML_CACHE_DIR, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        f.write(html)
    return html


def main():
    os.makedirs(config.HTML_CACHE_DIR, exist_ok=True)

    print("== 1/2 抓取目录页 ==")
    catalog = fetch_catalog()
    print(f"目录解析: {len(catalog)} 个词牌")
    cats = {}
    for it in catalog:
        cats[it["category"]] = cats.get(it["category"], 0) + 1
    print("分类统计:", cats)

    import json
    with open(config.CATALOG_JSON, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    # 校验编号连续性
    ids = sorted(it["id"] for it in catalog)
    gaps = [i for i in range(1, len(ids) + 1) if ids[i - 1] != i]
    if gaps:
        print(f"⚠ 编号缺口: {gaps}")

    print(f"\n== 2/2 抓取详情页（{len(catalog)} 页，限速 {config.REQUEST_DELAY}s）==")
    ok, fail = 0, []
    for i, it in enumerate(catalog, 1):
        html = fetch_detail(it["id"])
        if html:
            ok += 1
        else:
            fail.append(it["id"])
        if i % 10 == 0:
            print(f"  进度 {i}/{len(catalog)}（成功 {ok} 失败 {len(fail)}）")
        time.sleep(config.REQUEST_DELAY)

    print(f"\n=== 抓取完成 === 成功 {ok}/{len(catalog)}")
    if fail:
        print(f"失败清单（可重跑本脚本续爬）: {fail}")
        sys.exit(1)
    print("全部抓取成功 ✅")


if __name__ == "__main__":
    main()
