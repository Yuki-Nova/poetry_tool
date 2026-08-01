# 诗词填写工具

> 唐诗宋词填写辅助工具——平仄分析、押韵校验、格律即时高亮，类 IDE 编辑体验。

---

## 项目介绍

选定词牌或诗体后，在编辑器中逐字输入文本，工具实时分析每个字的平仄是否正确、韵脚是否押韵，并通过颜色高亮在输入位置直接给出直观反馈。

### 在线地址

| 站点 | 地址 |
|---|---|
| 填词工具 | https://poetry.yukinova.top |
| 管理后台 | https://admin.poetry.yukinova.top |

### 功能

| 功能 | 说明 |
|---|---|
| 格律选择 | 搜索式下拉框，覆盖 8 种诗体 + 817 个词牌 |
| 实时平仄分析 | 逐字查 8000+ 字平仄字典，即时着色反馈 |
| IDE 风格编辑器 | 输入区逐字高亮：蓝=平、灰=仄、红色波浪=出律、紫色虚线=多音字、金色边框=韵脚 |
| 行号与错误定位 | 侧边行号栏，错误行红点标记；错误面板点击条目跳转到对应位置 |
| 悬浮提示 | 鼠标悬停错误字 → 显示详细说明及多音字候选 |
| 押韵校验 | 支持中华新韵 / 平水韵 / 词林正韵三套韵书切换 |
| 词牌管理 | 独立后台，可视化格律编辑器录入/修改词牌 |

### 技术栈

| 模块 | 技术 |
|---|---|
| 前端（主工具） | Vue 3 + Vite，SPA 模式 |
| 前端（管理后台） | Vue 3 + Vite + Vue Router (Hash) + Axios |
| 后端 | Node.js + Express + SQLite (better-sqlite3) |
| 鉴权 | JWT (jsonwebtoken) |
| 样式 | 原生 CSS，"山影"古典风格 |
| 韵书数据 | 平水韵 105 部、词林正韵 19 部、中华新韵 14 部 |
| 词牌数据 | 龙榆生《唐宋词格律》153 个词牌（含多格式变体），逐字平仄 + 韵脚标注；叠加存量词牌共 825 个 |
| 部署 | 阿里云 ECS + 宝塔面板 + Nginx + PM2 + Let's Encrypt |

### 项目结构

```
poetry_tool/
├── tool/              # 主工具——填词填诗 SPA 编辑器
│   ├── src/
│   │   ├── components/    # UI 组件（PoetryIDE 等 9 个组件）
│   │   ├── composables/   # 业务逻辑（useAnalysis, useCipai, usePattern）
│   │   ├── core/          # 分析引擎（toneAnalyzer, rhymeChecker, patternMatcher）
│   │   └── data/          # 静态数据（平仄字典、韵书、诗体模板）
│   ├── tests/             # 核心引擎单元测试（vitest，33 用例）
│   ├── index.html         # SPA 入口
│   └── vite.config.js
├── admin/             # 后台管理——词牌可视化录入与编辑
│   ├── src/
│   │   ├── views/         # Login, CipaiList, CipaiEditor
│   │   ├── components/    # PatternGrid, PreviewPane
│   │   └── api/           # Axios + JWT 鉴权
│   └── vite.config.js
├── server/            # 后端——Express API + SQLite
│   ├── routes/            # auth, cipai
│   ├── middleware/        # JWT 鉴权中间件
│   ├── models/            # SQLite 数据模型
│   └── data/              # cipai.db（运行时数据，gitignore）
├── shared/            # 跨工程共享定义（词牌 schema 校验）
├── deploy/            # Nginx 配置 + PM2 ecosystem
├── scripts/           # 数据迁移与导入脚本
├── docs/              # 技术文档
├── prototype/         # 早期原型（Python）
├── dev.bat / dev.sh   # 本地一键启动脚本
├── longyusheng_crawler/  # 龙榆生《唐宋词格律》爬虫（词牌数据源，含 output 结果）
└── chinese_word_rhyme-main/  # 上游开源数据仓库（gitignore；词牌部分已废止，韵书/平仄字典仍为前端数据源）
```

### 数据流向

```
poetry.yukinova.top (Nginx)
    │
    ├── /               → tool/dist/        (主工具 SPA)
    ├── /admin/         → admin/dist/       (管理后台 SPA，独立子域名)
    └── /api/*          → proxy_pass :3002  (Express API)
                              │
                              ├── SQLite (cipai.db)
                              └── JWT 鉴权

admin.poetry.yukinova.top (Nginx)
    ├── /               → admin/dist/       (管理后台 SPA)
    └── /api/*          → proxy_pass :3002  (Express API)
```

---

## 本地开发

### 环境要求

| 依赖 | 版本 |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

### 一键启动

```bash
# Windows
dev.bat

# macOS / Linux / Git Bash
bash dev.sh
```

以上脚本会自动安装依赖并启动三个开发服务：

| 服务 | 端口 | 说明 |
|---|---|---|
| Server (Express) | 3001 | 后端 API |
| Tool (Vite) | 5174 | 主工具前端 |
| Admin (Vite) | 5173 | 管理后台前端 |

Vite 已配置代理，开发时 `/api` 请求自动转发到 `localhost:3001`。

### 手动启动

```bash
# 终端 1：后端
cd server && npm install && node app.js

# 终端 2：主工具前端
cd tool && npm install && npm run dev

# 终端 3：管理后台前端
cd admin && npm install && npm run dev
```

### 构建

```bash
# 主工具（SPA → tool/dist/）
cd tool && npm run build

# 管理后台（SPA → admin/dist/）
cd admin && npm run build
```

### 测试

核心分析引擎（平仄分析 / 押韵校验 / 格律匹配）有单元测试，基于 vitest：

```bash
cd tool && npm test
```

当前共 33 个用例，重点覆盖以下回归场景：

| 场景 | 说明 |
|---|---|
| 行号对齐 | 输入含空行 / 行首空格时，分析结果与文本行号一一对应，高亮与跳转不错位 |
| 出韵定位 | 出韵错误携带韵脚字的真实行号，错误面板跳转正确 |
| 韵脚判定 | 按句子的 `rhymeType`（平韵 / 仄韵 / 可平可仄）判定韵脚声调，不硬编码平声 |
| 多音字一致性 | 字典「多」标注与多音字候选表对齐，避免把常见多音字误判为单声调 |

---

## 部署方法

### 第一步：构建

在本地项目根目录执行：

```bash
cd admin && npm install && npm run build
cd ../tool && npm install && npm run build
```

产物：
```
admin/dist/          → index.html + assets/
tool/dist/           → index.html + assets/
```

### 第二步：上传到服务器

```powershell
$IP = "<ECS_IP>"

scp -r server/                     root@${IP}:/www/wwwroot/poetry/server/
scp -r shared/                     root@${IP}:/www/wwwroot/poetry/shared/
scp -r admin/dist/                 root@${IP}:/www/wwwroot/poetry/admin/dist/
scp -r tool/dist/                  root@${IP}:/www/wwwroot/poetry/tool/dist/
scp    deploy/ecosystem.config.js  root@${IP}:/www/wwwroot/poetry/deploy/
scp    deploy/nginx.conf           root@${IP}:/www/wwwroot/poetry/deploy/
scp -r scripts/                    root@${IP}:/www/wwwroot/poetry/scripts/
```

### 第三步：服务器配置

```bash
ssh root@<ECS_IP>

# 安装后端依赖
cd /www/wwwroot/poetry/server
npm install --production

# 创建环境变量
cat > .env << 'EOF'
PORT=3002
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=<设置你的强密码>
EOF

# PM2 启动
npm install -g pm2
pm2 start ../deploy/ecosystem.config.js
pm2 save
pm2 startup

# 验证
curl http://localhost:3002/api/health
```

### 第四步：Nginx 配置

参照 `deploy/nginx.conf`，在宝塔面板中为域名 `poetry.yukinova.top` 和 `admin.poetry.yukinova.top` 配置：

| 域名 | 根目录 | 说明 |
|---|---|---|
| `poetry.yukinova.top` | `tool/dist/` | 主工具 SPA |
| `admin.poetry.yukinova.top` | `admin/dist/` | 管理后台 SPA |

两个站点均需配置 `/api/` 反向代理到 `http://127.0.0.1:3002`。

```bash
# 语法检查与重载
nginx -t && nginx -s reload
```

### 第五步：SSL 证书

在宝塔面板中为两个站点分别申请 Let's Encrypt 证书，勾选强制 HTTPS。

### 第六步：DNS 解析

域名管理后台添加 A 记录：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| `poetry` | A | `<ECS_IP>` |
| `admin.poetry` | A | `<ECS_IP>` |

### 第七步：导入词牌数据

```bash
cd /www/wwwroot/poetry

# 确保 server 在运行
pm2 status

# 导入 818 个词牌
API_PASS=<密码> node scripts/import-cipai.js
```

### 部署验证

```bash
# API
curl https://poetry.yukinova.top/api/health

# 主工具
curl -I https://poetry.yukinova.top/

# 管理后台
curl -I https://admin.poetry.yukinova.top/
```

---

## 维护方法

### 修改个别字的平仄

编辑 `tool/src/data/custom.json` → `"tones"` 块：

```json
{
  "tones": {
    "望": "仄",
    "看": "平",
    "听": "多"
  }
}
```

格式：`"字": "平|仄|多"`。`"多"` 表示多音字。

### 修改个别字的韵部

编辑 `tool/src/data/custom.json` → `"rhymes"` 块，按韵书分别指定：

```json
{
  "rhymes": {
    "cilin":    { "斜": "第十部" },
    "pingshui": { "斜": "六麻"   },
    "xinyun":   { "斜": "乜斜"   }
  }
}
```

### 修改后生效

```bash
cd tool && npm run build && cd ..
```

将 `tool/dist/` 上传到服务器的 `/www/wwwroot/poetry/tool/dist/`。

```powershell
scp -r tool/dist/* root@<ECS_IP>:/www/wwwroot/poetry/tool/dist/
```

### 新增/修改词牌

1. 打开 `https://admin.poetry.yukinova.top/`，登录后在可视化编辑器中录入或修改
2. 或者从权威词谱数据源导入（当前使用龙榆生《唐宋词格律》爬虫）：

```bash
# 本地：抓取 → 解析 → 导出 → 直写导入（自动备份 db）
cd longyusheng_crawler
python fetch.py          # 抓取 153 个词牌页（首次）
python parse.py          # 解析 → output/longyusheng_cipai.json
python export.py         # 生成 cipaiSchema 兼容 JSON（含多格式变体）
python direct-import.py --dry   # 先试运行查看变更
python direct-import.py         # 正式导入（自动备份 cipai.db）
```

### 更新词牌数据

```bash
# 重新抓取/解析后导入即可（direct-import.py 为幂等 upsert：同名覆盖、缺失新增）
cd longyusheng_crawler && python fetch.py && python parse.py && python export.py
python direct-import.py --dry && python direct-import.py
```

> 注：旧导入脚本 `scripts/import-cipai.js`（解析 `chinese_word_rhyme-main/data/Ci_Tunes.json`，搜韵数据源）已废止，仅保留作数据对比参考。

### 数据库备份

```bash
# 备份
cp /www/wwwroot/poetry/server/data/cipai.db \
   /www/wwwroot/poetry/server/data/cipai.db.$(date +%Y%m%d).bak

# 恢复
cp /www/wwwroot/poetry/server/data/cipai.db.20260101.bak \
   /www/wwwroot/poetry/server/data/cipai.db
pm2 restart poetry-server
```

### 查看服务状态

```bash
pm2 status
pm2 logs poetry-server --lines 30
```

### 重启服务

```bash
pm2 restart poetry-server
```

### 更新前端

每次修改 `tool/` 或 `admin/` 源码后：

```bash
# tool
cd tool && npm run build
scp -r dist/* root@<ECS_IP>:/www/wwwroot/poetry/tool/dist/

# admin
cd admin && npm run build
scp -r dist/* root@<ECS_IP>:/www/wwwroot/poetry/admin/dist/
```

### 更新后端

```bash
scp -r server/* root@<ECS_IP>:/www/wwwroot/poetry/server/
ssh root@<ECS_IP> "cd /www/wwwroot/poetry/server && npm install --production && pm2 restart poetry-server"
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3002` | 后端端口 |
| `JWT_SECRET` | — | JWT 签名密钥，**生产必改** |
| `ADMIN_PASSWORD` | — | 后台登录密码，**生产必改** |

配置文件路径：`server/.env`（已 gitignore，不会推送到仓库）。

---

## 韵书说明

| 韵书 | 韵部数 | 默认适用 | 说明 |
|---|---|---|---|
| 中华新韵 | 14 | 诗 | 以普通话读音为基础 |
| 平水韵 | 105 | — | 传统诗韵 |
| 词林正韵 | 19 | 词 | 清代词学标准韵书 |

前端韵书选择栏可手动切换。诗体自动用新韵，词牌自动用词林正韵。

---

## 技术文档

| 文档 | 说明 |
|---|---|
| [docs/realtime-analysis-design.md](docs/realtime-analysis-design.md) | 实时分析+高亮功能架构设计 |
| [docs/standalone-migration-plan.md](docs/standalone-migration-plan.md) | 项目独立化方案 |
| [docs/deploy-guide.md](docs/deploy-guide.md) | 生产部署指南 |
| [docs/session-progress-20260723.md](docs/session-progress-20260723.md) | 开发进展记录 |

---

## 致谢

- **词牌格律数据**：来源于龙榆生先生《唐宋词格律》（上海古籍出版社 1978 年版）电子版，在线版本见 [longyusheng.org](http://www.longyusheng.org/cipai/)，由本项目爬虫程序抓取整理（`longyusheng_crawler/`）
- **平仄字典与韵书数据**：来源于 GitHub 开源项目 **[chinese_word_rhyme](https://github.com/charlesix59/chinese_word_rhyme.git)**（平仄字典、平水韵、词林正韵、中华新韵；其词牌部分已废止，仅保留字典与韵书）

感谢主要贡献者 [charlesix59](https://github.com/charlesix59) 及其他社区维护者的辛勤整理。
