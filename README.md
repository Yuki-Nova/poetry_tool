# 诗词填写工具

> 嵌入 Hexo 博客的唐诗宋词填写辅助工具——平仄分析、押韵校验、格律高亮。

---

## 项目介绍

选定词牌或诗体后，逐字输入文本，工具实时分析每个字的平仄是否正确、韵脚是否押韵，并通过颜色高亮给出直观反馈。

### 功能

| 功能 | 说明 |
|---|---|
| 格律选择 | 搜索式下拉框，覆盖 8 种诗体 + 817 个词牌 |
| 平仄分析 | 逐字查 8000+ 字平仄字典，蓝=平、白=仄、红色波浪=出律 |
| 押韵校验 | 支持中华新韵/平水韵/词林正韵三套韵书切换 |
| 多音字 | 紫色虚线提示，不视为错误 |
| 词牌管理 | 独立后台 admin，可视化格律编辑器录入/修改词牌 |

### 技术栈

| 模块 | 技术 |
|---|---|
| 前端（博客嵌入） | Vue 3 + Vite，UDM 单文件 |
| 前端（管理后台） | Vue 3 + Vite + Vue Router + Axios |
| 后端 | Node.js + Express + SQLite (better-sqlite3) |
| 鉴权 | JWT (jsonwebtoken) |
| 样式 | 原生 CSS，古典风格 |
| 韵书数据 | 平水韵 105 部、词林正韵 19 部、中华新韵 14 部 |
| 词牌数据 | 钦定词谱 818 个词牌，逐字平仄 + 韵脚标注 |
| 部署 | ECS + Nginx + PM2 |

### 项目结构

```
poetry-tool/
├── tool/        # 主工具——嵌入博客的填词填诗编辑器
├── admin/       # 后台管理——词牌可视化录入界面
├── server/      # 后端——词牌 CRUD + SQLite
├── shared/      # 跨工程共享定义（词牌 schema 校验）
├── deploy/      # Nginx 配置 + PM2 配置
├── scripts/     # 数据迁移与导入脚本
├── prototype/   # 早期原型（Python）
└── chinese_word_rhyme-main/   # 上游数据仓库
```

### 数据流向

```
Hexo 博客 /poetry
      │ <script src="/poetry/poetry-tool.js">
      ▼
   tool (UDM) ── GET /api/cipai ──→ server (Express)
      │                                  │
      │  平仄字典 + 韵书（打包在内）        │  SQLite
      ▼                                  ▼
   实时分析 + 高亮                    词牌存储
```

---

## 部署方法

### 环境要求

| 依赖 | 版本 |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Nginx | 任意 |
| PM2 | 任意 |
| 操作系统 | Linux（ECS） |

### 第一步：构建

在本地项目根目录执行：

```bash
# admin 后台
cd admin && npm install && npm run build

# tool 主工具
cd ../tool && npm install && npm run build
```

产物：
```
admin/dist/          → index.html + assets/
tool/dist/           → poetry-tool.js + poetry-tool.css
```

### 第二步：上传到服务器

```powershell
scp -r server/                     root@<IP>:/var/www/poetry-tool/server/
scp -r shared/                     root@<IP>:/var/www/poetry-tool/shared/
scp -r admin/dist/                 root@<IP>:/var/www/poetry-tool/admin/dist/
scp -r tool/dist/                  root@<IP>:/var/www/poetry-tool/tool/dist/
scp    deploy/ecosystem.config.js  root@<IP>:/var/www/poetry-tool/deploy/
scp    deploy/nginx.conf           root@<IP>:/var/www/poetry-tool/deploy/
scp -r scripts/                    root@<IP>:/var/www/poetry-tool/scripts/
scp -r chinese_word_rhyme-main/    root@<IP>:/var/www/poetry-tool/chinese_word_rhyme-main/
```

### 第三步：服务器配置

```bash
ssh root@<IP>

# 安装后端依赖（better-sqlite3 需在 Linux 上编译）
cd /var/www/poetry-tool/server
npm install --production

# 创建环境变量
cat > .env << 'EOF'
PORT=3001
JWT_SECRET=<随机字符串>
ADMIN_PASSWORD=<强密码>
EOF

# PM2 启动
npm install -g pm2
pm2 start ../deploy/ecosystem.config.js
pm2 save
pm2 startup

# 验证
curl http://localhost:3001/api/health
```

### 第四步：Nginx 配置

参照 `deploy/nginx.conf`，合并到 `/etc/nginx/conf.d/yukinova.conf`：

| 路由 | 目标 |
|---|---|
| `admin.yukinova.top` | `admin/dist/` 静态文件 |
| `yukinova.top/poetry` | `tool/dist/` 静态文件 |
| `yukinova.top/api` | `proxy_pass http://127.0.0.1:3001` |

```bash
# 语法检查与重载
nginx -t && nginx -s reload
```

### 第五步：DNS 解析

域名管理后台添加 A 记录：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| `admin` | A | `<ECS IP>` |

### 第六步：导入词牌数据

```bash
cd /var/www/poetry-tool

# 确保 server 在运行
pm2 status

# 导入 818 个词牌
API_PASS=<密码> node scripts/import-cipai.js
```

### 第七步：嵌入博客

Hexo 博客 `source/poetry/index.md`：

```html
<link rel="stylesheet" href="/poetry/poetry-tool.css" />
<div id="poetry-tool"></div>
<script>window.process = { env: { NODE_ENV: "production" } }</script>
<script src="/poetry/poetry-tool.js"></script>
```

```bash
hexo g && hexo d
```

### 部署验证

```bash
# API
curl https://yukinova.top/api/health

# 管理后台
curl -I https://admin.yukinova.top/

# 诗词工具
curl -I https://yukinova.top/poetry/poetry-tool.js
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

将 `tool/dist/poetry-tool.js` 上传到服务器的 `/var/www/poetry-tool/tool/dist/`。

```powershell
scp tool/dist/poetry-tool.js root@<IP>:/var/www/poetry-tool/tool/dist/
```



### 新增/修改词牌

1. 打开 `https://admin.yukinova.top/`，登录后在可视化编辑器中录入或修改
2. 或者直接编辑 `chinese_word_rhyme-main/data/Ci_Tunes.json`，重新运行：

```bash
API_PASS=<密码> node scripts/import-cipai.js
```

### 更新词牌数据

```bash
# 清空已有词牌
rm server/data/cipai.db
pm2 restart poetry-server

# 重新导入
API_PASS=<密码> node scripts/import-cipai.js
```

### 数据库备份

```bash
# 备份
cp /var/www/poetry-tool/server/data/cipai.db \
   /var/www/poetry-tool/server/data/cipai.db.$(date +%Y%m%d).bak

# 恢复
cp /var/www/poetry-tool/server/data/cipai.db.20260101.bak \
   /var/www/poetry-tool/server/data/cipai.db
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
scp dist/poetry-tool.js dist/poetry-tool.css root@<IP>:/var/www/poetry-tool/tool/dist/

# admin
cd ../admin && npm run build
scp -r dist/* root@<IP>:/var/www/poetry-tool/admin/dist/
```

### 更新后端

```bash
scp -r server/* root@<IP>:/var/www/poetry-tool/server/
ssh root@<IP> "cd /var/www/poetry-tool/server && npm install --production && pm2 restart poetry-server"
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3001` | 后端端口 |
| `JWT_SECRET` | — | JWT 签名密钥，**生产必改** |
| `ADMIN_PASSWORD` | — | 后台登录密码，**生产必改** |

配置文件路径：`server/.env`。

---

## 韵书说明

| 韵书 | 韵部数 | 默认适用 | 说明 |
|---|---|---|---|
| 中华新韵 | 14 | 诗 | 以普通话读音为基础 |
| 平水韵 | 105 | — | 传统诗韵 |
| 词林正韵 | 19 | 词 | 清代词学标准韵书 |

前端韵书选择栏可手动切换。诗体自动用新韵，词牌自动用词林正韵。

---

## 致谢

本项目使用的平仄字典、平水韵、词林正韵、中华新韵及词牌格律数据均来源于 GitHub 开源项目 **[chinese_word_rhyme](https://github.com/charlesix59/chinese_word_rhyme.git)**。

感谢主要贡献者 [charlesix59](https://github.com/charlesix59) 及其社区维护者的辛勤整理。
