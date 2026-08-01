# 爬虫修改计划：以龙榆生《唐宋词格律》为基准校正词牌/韵部数据

> 状态：**详细计划**（2026-08-01 制定；已对目标站完成两轮实测，解析规则已定稿）
> 背景：现有 `cipai.db`（817 词牌）与前端韵书/平仄字典错漏较多，数据源自搜韵（sou-yun.cn）爬取 + 维基文库平水韵 + 本地文本解析词林，未经权威校订。
> 原版爬虫位于 `chinese_word_rhyme-main/crawler/`（getCatalog/getTunes/getCharacter/getCilin/getCharExplain），本计划复用它验证过的技术路线（requests+bs4+限速+缓存），但目标源改为龙榆生站，解析按实测 HTML 结构重写。

---

## 一、目标数据源（已实测确认）

**站点**：`http://www.longyusheng.org/`（龙榆生先生纪念网站，在线可访问）
**编码**：**GB2312**（实测确认，必须显式 `decode('gb2312')`）
**入口**：`/cipai/index.html` → `/cipai/mulu.html`（按押韵形式分类的目录）
**详情页**：`/cipai/cipai1.html` ~ `cipai153.html`（实测：153 个词牌，编号 1~153 连续无缺口）

### 1.1 目录页（mulu.html）结构

```
5 个分类区块（按押韵形式）：
  平韵格 / 仄韵格 / 平仄韵转换格 / 平仄韵通叶格 / 平仄韵错叶格
每个分类下为 <a href="../cipai/cipaiN.html">词牌名</a> 列表
```

→ 目录即分类标签，可直接作为词牌「韵格」元数据（平韵格/仄韵格…），并辅助校验解析出的韵脚类型。

### 1.2 详情页 HTML 结构（已实测 cipai1/cipai10/cipai54）

```html
<title>词牌《如梦令》——唐宋词格律(龙榆生)</title>
<meta name="keywords" content="如梦令, 忆仙姿, 宴桃源, 词牌, ...">   ← 词牌名+全部别名
<h1 class="PageTitle">如梦令</h1>
<div class="ItemTitle">【如梦令、忆仙姿、宴桃源】 </div>
<div class="cipaiDesc"><p>又名《忆仙姿》、《宴桃源》。五代时后唐庄宗创作。……三十三字，五仄韵，一叠韵。</p></div>
<a name="cp0"></a><div class="ItemTitle">【定格】</div>        ← 格式 1（定格/又一体/双调…）
<div class="ci"><blockquote><div>…</div>…</blockquote></div>  ← 每 <div> 一句
<a name="cp1"></a><div class="ItemTitle">【双调】</div>        ← 格式 2（如有）
<div class="Appendix">【注】第一句可作“仄仄平平仄仄平”。…</div>  ← 注释
<script>var ces = {'ce1': {t:'<div>例词…</div>', w:'李存勗', c:'如梦令', …}};</script>  ← 例词（JS 变量）
```

### 1.3 平仄谱内部标记（实测定稿，重要！）

| 标记 | 含义 | 实测样例 |
|---|---|---|
| `<span class="ping">平</span>` | 该字位为**平声** | 江城子「仄平平（韵）」 |
| `<span class="ze">仄</span>` | 该字位为**仄声**（显式标注） | 如梦令「中仄中平平仄」 |
| `<span class="zhong">中</span>` | **可平可仄** | 各页大量出现 |
| **裸汉字**（无 span） | **仄声**（默认，与 span.ze 等价） | 江城子「仄平」的"平"？——注意：裸字仍需与 span.ze 一并处理，统一判"仄" |
| `<span class="yun0">（韵）</span>` | **韵脚标记**（通用，**不代表平/仄**） | 如梦令(仄韵)、江城子(平韵)均为 yun0 |
| `<span class="note">〖</span>…<span class="note">〗</span>` | **叠句标记**（句内重复，如"如梦，如梦"） | 如梦令第三句 |
| 逗号 `，` | 句中停顿，**不拆句** | 各页 |
| `<br class="empty">` | 双调/多片格式的**分片点** | 江城子【双调】格式内两片之间 |

> **关键修正**：原计划假设 `yun0`=平韵、`yun1`=仄韵 —— **实测推翻**。韵脚平仄由该字位的 ping/ze 判定，不是由 yun0/yun1 判定。`(韵)` 标记只负责"这是韵脚"。
> 注意：`span.ze` 显式存在（如梦令），裸字默认仄（江城子），两者解析结果一致——统一规则：**ping→平、ze/裸字→仄、zhong→中**。

---

## 二、爬虫实现方案（新目录 `scripts/crawler-longyusheng/`）

### 2.1 目录结构

```
scripts/crawler-longyusheng/
├── requirements.txt          # requests==2.32.*, beautifulsoup4==4.12.*, lxml
├── config.py                 # BASE_URL、编码 gb2312、限速 1.5s、重试 3 次、输出目录
├── fetch.py                  # 抓取目录页+详情页 → html_cache/（断点续爬）
├── parse.py                  # HTML → 结构化 JSON（核心解析器）
│   ├── parse_catalog.py      # mulu.html → 词牌列表 + 韵格分类
│   ├── parse_detail.py       # cipaiN.html → 词牌对象（格式/句子/韵脚/别名）
│   └── build_schema.py       # 多格式选择 + cipaiSchema 输出
├── validate.py               # 与 cipai.db 只读对比 → diff 报告
├── export.py                 # 生成最终 JSON（对齐 shared/cipaiSchema.js）
└── output/
    ├── html_cache/           # 原始 HTML（断点续爬、重跑不骚扰）
    ├── longyusheng_cipai.json
    ├── longyusheng_catalog.json
    ├── cipai_diff_report.md
    └── rhyme_diff_report.md
```

### 2.2 fetch.py 流程

```
1. GET /cipai/mulu.html → 解析 153 个 {id, name, category}
2. 对每个词牌 GET /cipai/cipaiN.html → 存 html_cache/cipaiN.html
3. 限速 1.5s/请求；失败重试 3 次（指数退避）；已缓存则跳过
4. 输出 longyusheng_catalog.json（含韵格分类）
```

### 2.3 parse.py 核心解析规则（对应实测结构）

**parse_detail.py — 单页 → 词牌对象**：

```
1. 标题：h1.PageTitle（或 meta keywords 首词）→ name
2. 别名：meta keywords 去除「词牌,格律,唐宋词格律,龙榆生,电子书」等噪声词 → alias[]
3. 简介：div.cipaiDesc 纯文本 → notes（含"三十三字，五仄韵"等）
4. 格式列表：按 <a name="cpN"> + ItemTitle 分组：
     - 每组标题：ItemTitle 文本（【定格】/【又一体】/【双调】/【摊破】…）
     - 每组平仄谱：紧随的 div.ci > blockquote > div（每个 div = 一句）
5. 句子解析（div 内）：
     - 遍历子节点，按文本顺序累积：
       ping span → '平'；ze span → '仄'；裸汉字 → '仄'；zhong span → '可平可仄'
       yun0 span → 前一字标记为韵脚（isRhyme=true）
       note 〖〗 → 忽略（叠句内容已在字位中，不额外处理）
       逗号/句号/问号 → 忽略（不参与 pattern，不作为句界）
     - div 结束 → 生成一句 {index, length, pattern[], isRhyme, rhymeType}
6. 分片（双调/三片）：格式块内按 <br class="empty"> 分割 → 片信息（仅记录片断点，sentences 顺序不变）
7. 注释：div.Appendix 纯文本 → 追加到 notes
8. 例词：script.ces JS 变量（可选阶段 M4 提取，供人工核对）
```

**rhymeType（韵脚类型）判定 — 三重校验**：

```
主规则（逐韵脚字）：
  韵脚字位为 平 → '平韵'；为 仄 → '仄韵'；为 可平可仄 → '可平可仄'
辅助校验：
  a. 简介文字："五平韵" / "五仄韵" / "平仄韵转换" 等 → 与主规则比对
  b. 目录分类：平韵格/仄韵格/平仄韵转换格/通叶格/错叶格 → 与主规则比对
  不一致 → 记入 warnings（人工复核清单），不自动改
```

**build_schema.py — 多格式选择策略（重要）**：

```
龙榆生站约 1/3 词牌有多个格式（定格/又一体/双调…）。
选择策略（按优先级）：
  1. 标题为【双调】的格式优先（宋词常用形态，如江城子）
  2. 否则取【定格】
  3. 否则取第一个
  4. 其余格式全部保留在 output 的 extraFormats 字段（供 diff 报告展示、人工决策）
同时记录格式标题（formatLabel: 定格/双调/又一体…）到 cipai 对象（如 notes 前缀）
```

### 2.4 validate.py — 与现有数据对比

```
输入：longyusheng_cipai.json + server/data/cipai.db（只读，better-sqlite3）
匹配：按 name 精确匹配；失败按 alias 匹配；再失败 → 无法匹配清单
对比项（每个交集词牌）：
  - 句数 / 每句字数 / 总字数
  - 每字平仄（逐位 diff，输出首个差异位置与差异字数统计）
  - 韵脚位置与 rhymeType
输出 cipai_diff_report.md：
  | 词牌 | 字数 | 句数 | 平仄一致 | 韵脚一致 | 差异摘要 |
  差异统计：完全一致 N / 平仄差异 M / 韵脚差异 K / 仅龙榆生有 X / 仅现库有 Y
```

### 2.5 export.py — 生成可导入数据

```
输出严格对齐 shared/cipaiSchema.js：
  { id, name, alias[], charCount, sentences:[{index,length,pattern[],isRhyme,rhymeType}], notes }
id 生成：沿用 scripts/import-cipai.js 的 NAME_TO_ID 映射 + 中文 hash 回退（复用现有逻辑）
  注意：现有库 id 已是该算法生成 → 同名词牌 id 一致 → 导入即为"更新"而非"新增"
输出：
  output/longyusheng_cipai.json        ← 全部 153 词牌（含 extraFormats）
  output/update_only.json              ← 仅交集且有差异的词牌（默认导入清单）
  output/add_only.json                 ← 仅龙榆生有、现库没有的词牌（可选新增）
```

### 2.6 导入衔接（复用现有管道，不改 server）

```
方案 A（推荐，走 API，与 import-cipai.js 一致）：
  node scripts/crawler-longyusheng/export.js 生成 JSON
  API_PASS=xxx node scripts/import-cipai.js --file output/update_only.json
  （需给 import-cipai.js 加 --file 参数，或新写 import-longyusheng.js 复用其 request/login 逻辑）
方案 B（直接写库，离线）：
  node scripts/crawler-longyusheng/direct-import.js
  （better-sqlite3 直连 cipai.db，UPDATE 交集词牌；需先备份 db）
导入前强制备份：cp cipai.db cipai.db.<date>.bak（README 已有流程）
```

---

## 三、韵部与平仄字典校正（第二阶段，独立实施）

| 数据 | 现状来源 | 方案 | 产出 |
|---|---|---|---|
| 平水韵 `rhymes/pingshui.json` | 维基文库爬取（getCharacter.py） | 龙榆生站内如无韵表 → 用《平水韵》权威刻本（如 wikisource 繁体版重新核对） | 差异报告 + 修正后 JSON |
| 词林正韵 `rhymes/cilin.json` | 本地 CilinRaw.txt 解析（getCilin.py） | 同上，重新核对 19 部 | 差异报告 + 修正后 JSON |
| 中华新韵 `rhymes/xinyun.json` | 上游 Xinyun_Rhyme.json（非搜韵） | 保持现状；以《中华新韵（十四韵）》官方表抽查 | 抽查报告 |
| 平仄字典 `tones.json` | Word_Tune.json 直接复制 | **用龙榆生 153 词牌 × 各格式的逐字平仄反推**：统计每字在谱中的平/仄标注，与 tones.json 比对 → 疑点清单（只报告不改） | 疑点清单 |

> 韵书/字典修正不自动落地，全部先出报告，人工复核。

---

## 四、里程碑与验收

| 阶段 | 内容 | 验收标准 |
|---|---|---|
| M1 抓取 | fetch.py 全量抓取 153 页 | html_cache 153 文件；失败 <3 且可重试；总时长 <15min |
| M2 解析 | parse.py 全量解析 | 153 词牌全部产出 sentences；每词牌句数>0；韵脚数>0；warnings 清单 <30 条（多为多格式歧义） |
| M3 对比 | validate.py 出 diff 报告 | 报告含完整统计表；交集词牌差异率统计（预期：相当一部分词牌平仄与现库不同——这正是目标） |
| M4 复核 | 你审阅 diff 报告 + 例词抽查 | 确认导入策略：update_only 全量导入 / 抽样导入 / 逐条决策 |
| M5 导入 | 备份 + 导入 update_only | 数据库词牌数不变（153 交集更新）；抽查 10 词牌人工核对平仄无误 |
| M6 韵书 | 第二阶段韵书/字典报告 | 报告产出，人工决定修改 |

## 五、风险与注意事项

1. **反爬合规**：仅 154 个页面总量，1.5s 限速，对公开古籍站压力极小；UA 伪装 + 仅 GET
2. **版权**：只输出结构化事实（平仄/韵脚/别名），notes 仅存格律说明，不复制例词原文；例词仅本地缓存用于核对
3. **编码**：GB2312 显式解码；`requests` 的 `apparent_encoding` 不可靠（实测标题乱码需 gb2312）
4. **韵脚语义**：`yun0` ≠ 平韵（已实测修正）；韵脚平仄按字位 ping/ze 判定 + 简介/目录双重校验
5. **裸字默认仄**：实测江城子裸字=仄、如梦令显式 span.ze——统一按"裸字→仄"处理，并在 M2 增加抽样断言（随机 10 页核对字数=句内字数）
6. **不自动覆盖**：diff 报告先出，用户批准后才导入；导入前强制备份 db
7. **多格式歧义**：优先【双调】→【定格】→第一个，其余进 extraFormats 供人工

## 六、与现有代码的衔接

- 复用：`scripts/import-cipai.js` 的 request/login/toId/NAME_TO_ID 逻辑（加 `--file` 参数即可，或新脚本 import 它）
- 复用：`shared/cipaiSchema.js` 的 validateCipai() 在 export.py 中做导入前校验（可加：Node 端 require shared/cipaiSchema.js）
- 复用：README 的备份/恢复流程
- 前端零改动：schema 结构不变，tool/admin 自动生效
- 原版爬虫：保留不动（作为搜韵数据溯源与对比参考）；本计划是新增 `scripts/crawler-longyusheng/`
