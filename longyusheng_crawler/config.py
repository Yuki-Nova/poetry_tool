# -*- coding: utf-8 -*-
"""龙榆生《唐宋词格律》爬虫 — 配置文件

目标站：http://www.longyusheng.org/cipai/（龙榆生先生纪念网站，唐宋词格律电子版）
编码：GB2312（实测必须显式解码）
"""

import os

# ── 站点 ──
BASE_URL = "http://www.longyusheng.org"
CIPAI_INDEX = BASE_URL + "/cipai/index.html"
CIPAI_MULU = BASE_URL + "/cipai/mulu.html"
CIPAI_DETAIL = BASE_URL + "/cipai/cipai{}.html"  # cipai1.html ~ cipai153.html

# ── 抓取行为 ──
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
REQUEST_DELAY = 1.5      # 每页间隔秒数（实测总量 154 页，全程约 5 分钟）
MAX_RETRY = 3            # 失败重试次数
RETRY_BACKOFF = 5        # 重试基础等待（秒），指数退避
TIMEOUT = 20             # 单请求超时

# ── 路径 ──
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
HTML_CACHE_DIR = os.path.join(OUTPUT_DIR, "html_cache")
CATALOG_JSON = os.path.join(OUTPUT_DIR, "longyusheng_catalog.json")
CIPAI_JSON = os.path.join(OUTPUT_DIR, "longyusheng_cipai.json")
DIFF_REPORT = os.path.join(OUTPUT_DIR, "cipai_diff_report.md")
RHYME_REPORT = os.path.join(OUTPUT_DIR, "rhyme_diff_report.md")

# ── 词牌编号范围（实测：1~153 连续）──
CIPAI_ID_RANGE = (1, 153)

# 解析时的韵格分类（mulu.html 目录分类）
CATEGORY_NAMES = [
    "平韵格", "仄韵格", "平仄韵转换格", "平仄韵通叶格", "平仄韵错叶格",
]
