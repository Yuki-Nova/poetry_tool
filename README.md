# 诗词填写工具 — 项目文档

> 建立在个人博客上的填词填诗辅助工具，提供平仄分析、中华新韵押韵校验与 IDE 风格高亮提示。

---

## 技术栈

| 模块 | 技术选型 |
|---|---|
| 主工具（嵌入博客） | Vue 3 + Vite（library 模式输出 UMD） |
| 后台录入界面 | Vue 3 + Vite + Axios |
| 后端服务 | Node.js + Express + SQLite |
| 样式 | 原生 CSS（古典风格，轻量） |
| 韵书 | 中华新韵（18 韵部） |
| 多音字 | 仅提示，不强制（紫色虚线 + tooltip） |
| 部署 | 现有 ECS + Nginx + PM2 |

---

## 项目结构概览

```
poetry-tool/
├── tool/                              # 主工具 —— 嵌入博客的填词填诗编辑器
├── admin/                             # 后台管理 —— 词牌录入界面
├── server/                            # 后端 —— 词牌数据 CRUD 服务
├── shared/                            # 跨工程共享定义
└── deploy/                            # 部署配置
```

---

## 详细目录结构

```
poetry-tool/
│
├── 📦 tool/
│   ├── src/
│   │   ├── core/
│   │   │   ├── toneAnalyzer.js
│   │   │   ├── rhymeChecker.js
│   │   │   ├── patternMatcher.js
│   │   │   └── charClassifier.js
│   │   ├── data/
│   │   │   ├── tones.json
│   │   │   ├── rhymes/
│   │   │   │   └── xinyun.json
│   │   │   └── patterns/
│   │   │       └── shige.json
│   │   ├── components/
│   │   │   ├── PatternSelector.vue
│   │   │   ├── PoetryEditor.vue
│   │   │   ├── CharToken.vue
│   │   │   ├── RhymeHint.vue
│   │   │   └── ErrorPanel.vue
│   │   ├── composables/
│   │   │   ├── useAnalysis.js
│   │   │   ├── usePattern.js
│   │   │   └── useCipai.js
│   │   ├── App.vue
│   │   └── main.js
│   ├── vite.config.js
│   └── package.json
│
├── 📦 admin/
│   ├── src/
│   │   ├── views/
│   │   │   ├── Login.vue
│   │   │   ├── CipaiList.vue
│   │   │   └── CipaiEditor.vue
│   │   ├── components/
│   │   │   ├── PatternGrid.vue
│   │   │   └── PreviewPane.vue
│   │   ├── api/
│   │   │   └── cipai.js
│   │   ├── App.vue
│   │   └── main.js
│   ├── vite.config.js
│   └── package.json
│
├── 📦 server/
│   ├── routes/
│   │   ├── cipai.js
│   │   └── auth.js
│   ├── models/
│   │   └── cipai.js
│   ├── middleware/
│   │   └── auth.js
│   ├── data/
│   │   └── cipai.db
│   ├── app.js
│   └── package.json
│
├── shared/
│   └── cipaiSchema.js
│
├── deploy/
│   ├── nginx.conf
│   └── ecosystem.config.js
│
└── package.json                       # 根 workspace 配置
```

---

## 各文件功能说明

### 📦 tool/ — 嵌入博客的填词填诗编辑器

#### `src/core/` — 纯逻辑层（零 UI 依赖，可独立单元测试）

| 文件 | 功能 |
|---|---|
| `toneAnalyzer.js` | 接收一句诗的字符串，逐字查 `tones.json`，返回每个字的「平 / 仄 / 多音」标注结果 |
| `rhymeChecker.js` | 提取各句韵脚字，查 `xinyun.json` 判断是否同韵部，返回押韵是否正确 |
| `patternMatcher.js` | 将 `toneAnalyzer` 的结果与当前选中的格律模板逐位比对，标出哪个字「出律」 |
| `charClassifier.js` | 专门处理多音字（如「长」有平仄两读），识别后打 flag 供 UI 显示候选音提示 |

#### `src/data/` — 静态数据（打包进产物）

| 文件 | 功能 |
|---|---|
| `tones.json` | 全量平仄字典，格式 `{"花":"平","月":"仄","长":"多音",...}`，约数万条 |
| `rhymes/xinyun.json` | 中华新韵 18 韵部表，记录每个字属于哪个韵部，供 `rhymeChecker` 查询 |
| `patterns/shige.json` | 五绝 / 七绝 / 五律 / 七律四种起式格律模板，包含逐字平仄要求和韵脚位置；词牌格律另从后端拉取 |

#### `src/components/` — UI 组件

| 文件 | 功能 |
|---|---|
| `PatternSelector.vue` | 顶部选择栏，让用户选「五言绝句 / 七言律诗 / 词牌名」，切换后通知编辑器换模板 |
| `PoetryEditor.vue` | 核心编辑器容器，监听用户输入，触发 core 层分析，将结果分发给各子组件 |
| `CharToken.vue` | 最小渲染单元，代表一个字，根据分析结果渲染对应颜色 / 下划线 / 角标 |
| `RhymeHint.vue` | 侧边或底部押韵提示面板，显示当前韵脚字所属韵部及同韵部常用字推荐 |
| `ErrorPanel.vue` | 类 IDE 错误列表，汇总所有出律 / 出韵位置，点击可跳转到对应字 |

#### `src/composables/` — 响应式逻辑复用

| 文件 | 功能 |
|---|---|
| `useAnalysis.js` | 维护分析结果的响应式状态，封装「输入变化 → 调用 core → 更新结果」的完整流程 |
| `usePattern.js` | 管理当前选中的格律模板，负责从 `shige.json` 或 API 加载对应格式数据 |
| `useCipai.js` | 从后端 `/api/cipai` 拉取词牌列表，缓存结果，供 `PatternSelector` 使用 |

---

### 📦 admin/ — 词牌后台录入界面

#### `src/views/` — 页面级组件

| 文件 | 功能 |
|---|---|
| `Login.vue` | 简单密码登录页，验证通过后存 JWT token 到 localStorage，解锁其他页面 |
| `CipaiList.vue` | 词牌总览页，展示所有已录入词牌，支持搜索、排序、删除 |
| `CipaiEditor.vue` | 新建 / 编辑词牌主界面，组合 `PatternGrid` 和 `PreviewPane`，提交到后端 |

#### `src/components/` — 后台专用组件

| 文件 | 功能 |
|---|---|
| `PatternGrid.vue` | 录入核心，按词牌字数生成格子，点击切换「平 / 仄 / 可平可仄 / 韵脚」，比手写 JSON 直观 |
| `PreviewPane.vue` | 实时预览当前录入的词牌格律效果，复用 `CharToken` 渲染，所见即所得 |

#### `src/api/`

| 文件 | 功能 |
|---|---|
| `cipai.js` | 封装所有对后端的 HTTP 请求（Axios），包括获取列表、获取单条、新增、修改、删除 |

---

### 📦 server/ — 后端 Express 服务

#### `routes/`

| 文件 | 功能 |
|---|---|
| `cipai.js` | 词牌 CRUD 路由：`GET /api/cipai`、`POST /api/cipai`、`PUT /api/cipai/:id`、`DELETE /api/cipai/:id` |
| `auth.js` | 登录路由 `POST /api/login`，验证密码，签发 JWT token |

#### `models/`

| 文件 | 功能 |
|---|---|
| `cipai.js` | 封装所有 SQLite 数据库操作，定义表结构，提供增删改查方法供 routes 调用 |

#### `middleware/`

| 文件 | 功能 |
|---|---|
| `auth.js` | Express 中间件，拦截需要鉴权的路由，校验请求头中 JWT token 的有效性 |

#### `data/`

| 文件 | 功能 |
|---|---|
| `cipai.db` | SQLite 数据库文件，存储所有已录入词牌的格律数据，单文件，备份方便 |

---

### 📁 shared/ — 跨工程共享

| 文件 | 功能 |
|---|---|
| `cipaiSchema.js` | 词牌数据结构的唯一定义，`tool` / `admin` / `server` 三端共同 import，保证数据格式不对齐 |

---

### 📁 deploy/ — 部署配置

| 文件 | 功能 |
|---|---|
| `nginx.conf` | Nginx 配置片段，定义 `/poetry`、`admin.yukinova.top`、`/api` 路由转发规则 |
| `ecosystem.config.js` | PM2 配置文件，定义 `poetry-server` 进程的启动命令、环境变量、自动重启策略 |

---

## 核心数据结构

### 词牌数据结构（cipaiSchema.js）

```js
{
  id: "manjianghong",
  name: "满江红",
  alias: ["满江红慢"],
  charCount: 93,
  sentences: [
    {
      index: 0,
      length: 4,
      pattern: ["仄", "仄", "平", "平"],   // 逐字格律要求
      isRhyme: false,
      rhymeType: null
    },
    {
      index: 1,
      length: 3,
      pattern: ["平", "仄", "仄"],
      isRhyme: true,
      rhymeType: "仄韵"                    // 平韵 | 仄韵 | 可平可仄
    }
    // ...
  ],
  notes: "双调九十三字，前片八句四仄韵"
}
```

### 字级高亮状态（CharToken）

```js
{
  char: "花",
  expected: "平",        // 格律模板要求
  actual: "平",          // 字典查得结果
  isRhyme: true,         // 是否处于韵脚位
  rhymeGroup: "发花",    // 所属中华新韵韵部
  status: "ok"           // ok | tone-error | rhyme-error | multi-tone
}
```

### 高亮颜色方案

| 状态 | 样式 |
|---|---|
| 正确平声 | 淡蓝色底 |
| 正确仄声 | 无底色 |
| 平仄出律 | 红色波浪下划线 |
| 韵脚正确 | 金色右下角标 |
| 韵脚不押 | 橙色边框 |
| 多音字 | 紫色虚线 + tooltip 候选音 |

---

## 数据流向

```
                    ┌─────────────────────────────────┐
                    │           Hexo 博客页面           │
                    │   /poetry  →  嵌入 tool/dist     │
                    └──────────────┬──────────────────┘
                                   │ 启动时拉取词牌列表
                                   ▼
┌──────────────┐   REST API   ┌──────────────────────┐
│  admin 后台  │ ──CRUD──────▶│   server (Express)   │
│  词牌录入    │              │   /api/cipai         │
└──────────────┘              └──────────┬───────────┘
                                         │
                                    SQLite cipai.db
```

---

## 服务器部署规划（接现有 ECS）

```
Nginx
  ├── yukinova.top            →  Hexo 博客（现有）
  ├── yukinova.top/poetry     →  tool/dist 静态产物（新增）
  ├── admin.yukinova.top      →  admin/dist 静态产物（新增，可加 basic auth）
  └── yukinova.top/api        →  反向代理到 server:3001（新增）

PM2
  ├── hexo-blog               （现有）
  ├── photo-gallery           （现有）
  └── poetry-server           （新增，server/app.js）
```

---

## 开发阶段规划

| Phase | 模块 | 内容 |
|---|---|---|
| Phase 1 | server | 词牌 CRUD API + SQLite 建表，接口联调 |
| Phase 2 | admin | `PatternGrid` 可视化编辑器 + 完整录入界面 |
| Phase 3 | tool | 数据层整理：平仄字典 + 中华新韵 JSON |
| Phase 4 | tool | 核心逻辑：`toneAnalyzer` + `patternMatcher` + `rhymeChecker` |
| Phase 5 | tool | 编辑器 UI：`PoetryEditor` + `CharToken` 高亮渲染 |
| Phase 6 | 集成 | 嵌入 Hexo，Nginx 路由配置，PM2 守护进程 |

---

## 本地开发

### 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3001` | 后端服务端口 |
| `JWT_SECRET` | `poetry-tool-secret-key-change-in-production` | JWT 签名密钥，**生产环境务必修改** |
| `ADMIN_PASSWORD` | `admin123` | 后台登录密码，**生产环境务必修改** |

可在 `server/` 目录下创建 `.env` 文件覆盖默认值：

```bash
PORT=3001
JWT_SECRET=your-random-secret-here
ADMIN_PASSWORD=your-strong-password
```

### 安装与启动

```bash
# 1. 安装根依赖（可选，仅修复 package.json）
cd poetry-tool

# 2. 启动后端（端口 3001）
cd server
npm install
npm start          # 生产模式
# 或
npm run dev        # 开发模式（node --watch，文件变更自动重启）

# 3. 启动 admin 后台（端口 5173）
cd ../admin
npm install
npx vite --config vite.config.js
```

启动后：
- 后端 API：`http://localhost:3001/api`
- Admin 后台：`http://localhost:5173`
- Vite 自动将 `/api` 请求代理到 `localhost:3001`，无需额外配置

### 快速验证

```bash
# 健康检查
curl http://localhost:3001/api/health

# 登录获取 token
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'

# 使用返回的 token 创建词牌
curl -X POST http://localhost:3001/api/cipai \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{...}'
```

---

## 生产部署

### 构建前端

```bash
cd admin
npm run build        # 产物在 dist/，或通过 npx vite build 手动执行
```

> 注：`vite build` 需要在 `admin/` 目录下执行。若从项目根目录调用，需指定 `--config admin/vite.config.js`。

产物结构：
```
admin/dist/
├── index.html
└── assets/
    ├── index-XXXXX.css
    └── index-XXXXX.js
```

### Nginx 配置

```nginx
# admin 后台（子域名）
server {
    listen 80;
    server_name admin.yukinova.top;

    root /path/to/poetry-tool/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# API 反向代理（主域名 /api）
server {
    listen 80;
    server_name yukinova.top;

    # ... 现有 Hexo 配置 ...

    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### PM2 守护进程

使用 `deploy/ecosystem.config.js`：

```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start deploy/ecosystem.config.js

# 常用命令
pm2 status              # 查看状态
pm2 logs poetry-server  # 查看日志
pm2 restart poetry-server
pm2 stop poetry-server
```

### 数据库备份

SQLite 数据库为单文件 `server/data/cipai.db`，可直接复制备份：

```bash
# 备份
cp server/data/cipai.db server/data/cipai.db.$(date +%Y%m%d).bak

# 恢复
cp server/data/cipai.db.20260101.bak server/data/cipai.db
```

---

## 各层职责一句话总结

```
core/        ── 只管算，不管显示
data/        ── 只存数据，不含逻辑
components/  ── 只管显示，逻辑交给 composables
composables/ ── 连接 core 与 UI 的桥梁
server/      ── 只服务词牌 CRUD，其余分析全在前端
shared/      ── 数据契约，三端共同遵守
```
