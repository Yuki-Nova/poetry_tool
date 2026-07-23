# 项目独立化方案与部署文档

> 目标：将诗词填写工具从 Hexo 博客嵌入模式改造为独立的 Web 站点，拥有自己的域名和完整的页面。

---

## 1. 现状分析：与博客的耦合点

### 1.1 架构对比

```
当前(嵌入博客)                          目标(独立站点)
───────────────────────────          ─────────────────────────
yukinova.top (Hexo博客)              poetry.yukinova.top
  ├── /poetry/                         ├── /              → 填词工具(SPA)
  │     ├── poetry-tool.js (UMD)       ├── /admin/        → 管理后台(SPA)
  │     └── poetry-tool.css            ├── /api/          → 后端 API
  │                                    └── 独立的 index.html
  ├── /api/  → Express :3001
  │
  ├── /... (博客文章)
  │
admin.yukinova.top
  ├── /       → admin/dist/
  └── /api/   → Express :3001
```

### 1.2 耦合点清单

| # | 耦合点 | 文件 | 说明 |
|---|---|---|---|
| 1 | **UMD Library 构建** | `tool/vite.config.js` | 构建为 `poetry-tool.js` 库文件，无独立 HTML |
| 2 | **无 entry HTML** | `tool/` (缺失) | 没有 `index.html`，依赖宿主博客页面提供挂载点 |
| 3 | **`window.process` polyfill** | Hexo 页面 | 博客页面手动注入 `window.process`，UMD 需要 |
| 4 | **全局挂载 API** | `tool/src/main.js` | `window.PoetryTool.mount()` 设计给外部调用 |
| 5 | **根选择器 `#poetry-tool`** | `tool/src/main.js` + `App.vue` | 硬编码，与博客 `<div>` 耦合 |
| 6 | **Nginx 路径 `/poetry/`** | `deploy/nginx.conf` | 静态文件挂在博客子路径 |
| 7 | **跨域部署** | Admin 在 `admin.yukinova.top`，Tool 在 `yukinova.top` | 两个域名，CORS 全开 |

### 1.3 解耦后保留的资产

以下模块**无需修改**，它们与博客没有耦合：

| 模块 | 说明 |
|---|---|
| `tool/src/core/` | 四个分析引擎完全独立 |
| `tool/src/data/` | 静态字典/韵书数据完全独立 |
| `tool/src/composables/` | 业务逻辑完全独立（仅 `useCipai` 调用 `/api/cipai`，与域名无关） |
| `tool/src/components/` | UI 组件基本独立（CSS 作用域在 `#poetry-tool`，需要改为 `#app`） |
| `admin/` | **已经是独立 SPA**，无需改造 |
| `server/` | 纯 API，与前端部署无关 |
| `shared/` | 跨模块 schema，不变 |

---

## 2. 独立化改造方案

### 2.1 总体策略

```
tool/  UMD Library  ──改造──→  SPA Application (同 admin 模式)

结果: tool/dist/ 从
    poetry-tool.js + poetry-tool.css
变为
    index.html + assets/*.js + assets/*.css
```

改造模式参考 `admin/`（已经是一个标准 Vite SPA）。

### 2.2 需要修改的文件

#### 2.2.1 新建: `tool/index.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>诗词填写工具</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

**改动说明**: 
- 挂载点从 `#poetry-tool` 改为 `#app`（Vue 3 SPA 惯例）
- 使用 `<script type="module">` 而非 UMD `<script src>` 
- Vite 开发服务器和构建都会自动处理

#### 2.2.2 修改: `tool/vite.config.js`

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  build: {
    // SPA 默认构建，不再需要 lib 配置
    outDir: 'dist',
    assetsDir: 'assets',
  }
  // 移除 define (不再需要 process.env polyfill)
  // 移除 build.lib (不再是 UMD 库)
})
```

**改动说明**:
- ❌ 删除 `build.lib` 块（UMD 配置）
- ❌ 删除 `define` 块（`process.env` polyfill）
- ✅ Vite 默认 SPA 模式自动生成 `index.html` + `assets/`

#### 2.2.3 修改: `tool/src/main.js`

```js
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

**改动说明**:
- 挂载选择器从 `#poetry-tool` → `#app`
- ❌ 删除 `window.PoetryTool` 全局暴露（SPA 不需要）
- ❌ 删除 `window !== 'undefined'` 判断

#### 2.2.4 修改: `tool/src/App.vue` (仅 CSS 作用域)

将根 CSS 选择器从 `#poetry-tool` 改为 `#app`:

```css
/* 修改前 */
#poetry-tool {
  /* ... */
}

/* 修改后 */
#app {
  /* ... */
}
```

同时检查所有组件中 `#poetry-tool` 的引用并替换。

#### 2.2.5 保留不变: `tool/package.json`

`package.json` 中的 `dependencies` 和 `scripts` 保持不变，SAP 模式的 `vite` 和 `vite build` 命令行为自动切换。

### 2.3 可选保留: UMD 兼容构建

如果仍需在博客中嵌入工具，可通过 Vite 多入口配置同时输出两种格式：

```js
// vite.config.js - 双模式
export default defineConfig(({ mode }) => {
  if (mode === 'library') {
    return {
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/main.js'),
          name: 'PoetryTool',
          formats: ['umd'],
          fileName: () => 'poetry-tool.js'
        },
        outDir: 'dist-umd',
        // ... UMD 配置
      }
    }
  }
  // 默认 SPA 模式
  return { /* SPA 配置 */ }
})
```

然后在 `package.json` 中添加脚本：
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:umd": "vite build --mode library"
  }
}
```

**建议**: 先做纯 SPA 模式，后续按需添加 UMD 兼容。

### 2.4 目录结构变化

```
tool/
├── index.html              [新增] SPA 入口
├── package.json            [不变]
├── vite.config.js          [修改] SPA 模式
├── src/
│   ├── main.js             [修改] 简化挂载
│   ├── App.vue             [修改] 根选择器 #app
│   ├── core/               [不变]
│   ├── data/               [不变]
│   ├── composables/        [不变]
│   └── components/         [不变]
└── dist/                   [产物变化]
    ├── index.html          [新增]
    └── assets/
        ├── index-xxxxx.js  [变化] SPA bundle
        └── index-xxxxx.css [变化]
```

---

## 3. 站点架构设计

### 3.1 域名规划

```
poetry.yukinova.top          ← 独立站点主域名

路由:
  /                 → tool SPA (填词工具主页)
  /admin/           → admin SPA (管理后台)
  /api/             → Express API (后端)
```

> 选用子域名 `poetry.yukinova.top`，与博客 `yukinova.top` 和后台 `admin.yukinova.top` 在同一顶级域下，DNS 管理方便。

### 3.2 独立站点页面结构

```
┌─────────────────────────────────────────────────┐
│  poetry.yukinova.top                             │
│                                                   │
│  ┌── 顶栏 ────────────────────────────────────┐  │
│  │  诗词填写工具        [管理后台]  [关于]      │  │
│  ├─────────────────────────────────────────────┤  │
│  │                                              │  │
│  │       ┌──────────────────────────┐           │  │
│  │       │                          │           │  │
│  │       │    填词工具主体区域       │           │  │
│  │       │    (当前 App.vue 内容)    │           │  │
│  │       │                          │           │  │
│  │       └──────────────────────────┘           │  │
│  │                                              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  /admin/  → 管理后台(词牌编辑器)                    │
│                                                   │
└─────────────────────────────────────────────────┘
```

> 注：初期可以不做顶栏导航，直接让 `tool/` 的 App.vue 占据全页。管理后台仍通过独立路径 `/admin/` 访问。后续迭代可添加统一导航。

### 3.3 API 调用变化

工具 SPA 中 `useCipai()` 调用 `GET /api/cipai`，由于同域部署（`poetry.yukinova.top`），不存在跨域问题。

```
当前:   tool (yukinova.top)  ──CORS──→  api (yukinova.top/api)
        admin (admin.yukinova.top) ──CORS──→ api (admin.yukinova.top/api)

独立后: tool (poetry.yukinova.top) ──同域──→ api (poetry.yukinova.top/api)
        admin (poetry.yukinova.top/admin) ──同域──→ api (poetry.yukinova.top/api)
```

**优势**: 不再需要 CORS 中间件，安全性更好；admin 的 Axios 拦截器也无需改动。

---

## 4. 服务器部署方案

### 4.1 新的 Nginx 配置

```nginx
# /etc/nginx/conf.d/poetry.yukinova.conf

# ============================================
# poetry.yukinova.top - 诗词填写工具独立站点
# ============================================

server {
    listen 80;
    server_name poetry.yukinova.top;

    # ============ 管理后台 SPA ============
    # /admin 路径 → admin/dist/
    location /admin {
        alias /var/www/poetry-tool/admin/dist;
        try_files $uri $uri/ /admin/index.html;
        
        # SPA fallback: admin 内部路由由 Vue Router 处理
        location ~ ^/admin(/.*)$ {
            alias /var/www/poetry-tool/admin/dist;
            try_files $1 $1/ /admin/index.html;
        }
    }

    # ============ 后端 API ============
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ============ 主工具 SPA (默认) ============
    location / {
        root /var/www/poetry-tool/tool/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

> **说明**: Admin 路径处理比之前复杂一些，因为 admin 的 Vue Router 使用 hash 模式（`#/login`, `#/editor/xxx`），所以实际上 `try_files` 的 SPA fallback 可以简化。如果后续 admin 改用 history 模式，则使用上面完整的配置。

简化版（admin 保持 hash 路由）：

```nginx
server {
    listen 80;
    server_name poetry.yukinova.top;

    # 管理后台
    location /admin/ {
        alias /var/www/poetry-tool/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
    }

    # API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 主工具
    location / {
        root /var/www/poetry-tool/tool/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4.2 构建产物路径规划（服务器上）

```
/var/www/poetry-tool/
├── tool/
│   └── dist/           ← tool SPA 构建产物
│       ├── index.html
│       └── assets/
│           ├── index-xxxxx.js
│           └── index-xxxxx.css
├── admin/
│   └── dist/           ← admin SPA 构建产物(不变)
│       ├── index.html
│       └── assets/
├── server/             ← Express 后端(不变)
│   ├── app.js
│   ├── data/
│   │   └── cipai.db
│   ├── node_modules/
│   └── .env
├── shared/             ← 共享模块
├── scripts/            ← 数据脚本
└── deploy/             ← 部署配置
    ├── ecosystem.config.js
    └── nginx.conf      (更新)
```

### 4.3 PM2 配置（不变）

`ecosystem.config.js` 中的 Express 进程配置保持不变：

```js
module.exports = {
  apps: [{
    name: 'poetry-server',
    script: './app.js',
    cwd: '/var/www/poetry-tool/server',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    max_memory_restart: '200M'
  }]
}
```

### 4.4 Admin 的 base 路径处理

当前 `admin/vite.config.js` 没有设置 `base`，默认是 `/`。在独立站点中 admin 挂载在 `/admin/` 路径下，需要修改：

```js
// admin/vite.config.js
export default defineConfig({
  base: '/admin/',    // ← 新增：静态资源路径前缀
  // ... 其余不变
})
```

同时检查 `admin/src/router/index.js`（如果存在），确保 router 的 base 正确。如果使用的是 hash 模式（URL 带 `#`），则无需修改 router；如果是 history 模式，需要设置 `base: '/admin/'`。

> **当前 admin 使用 hash 路由** (`#/login`, `#/editor/xxx`)，所以即使不修改 `base`，功能也不会异常。但为了静态资源路径正确（`/admin/assets/xxx.js`），建议加上 `base: '/admin/'`。

---

## 5. 迁移步骤

### 5.1 本地改造与验证

```
Phase 1: 代码改造
─────────────────
□ 1. 创建 tool/index.html
□ 2. 修改 tool/vite.config.js (SPA 模式)
□ 3. 修改 tool/src/main.js (#app 挂载)
□ 4. 修改 tool/src/App.vue (CSS 选择器)
□ 5. 全局搜索替换: #poetry-tool → #app
□ 6. 修改 admin/vite.config.js (base: '/admin/')

Phase 2: 本地构建验证
─────────────────
□ 7. cd tool && npm run build
     → 确认 dist/ 包含 index.html + assets/
□ 8. cd admin && npm run build
     → 确认 dist/ 路径正确
□ 9. 本地预览: cd tool && npx vite preview
     → 浏览器打开 http://localhost:4173 验证
□ 10. API 联通测试: 启动 server, 确认 /api/cipai 可用

Phase 3: 上传部署
─────────────────
□ 针对服务器执行部署步骤(见 5.2)
```

### 5.2 服务器部署步骤

```bash
# ============================================
# 第一步：上传新构建产物
# ============================================

# tool (新 SPA 构建)
scp -r tool/dist/* root@<IP>:/var/www/poetry-tool/tool/dist/

# admin (带 base 路径的构建)
scp -r admin/dist/* root@<IP>:/var/www/poetry-tool/admin/dist/

# deploy 配置
scp deploy/nginx.conf root@<IP>:/var/www/poetry-tool/deploy/

# ============================================
# 第二步：服务器上更新 Nginx
# ============================================

ssh root@<IP>

# 用新配置替换旧的
cp /var/www/poetry-tool/deploy/nginx.conf /etc/nginx/conf.d/poetry.conf

# 语法检查
nginx -t

# 重载
nginx -s reload

# ============================================
# 第三步：重启后端 (如有代码变更)
# ============================================

cd /var/www/poetry-tool/server

# 如果 server 代码有更新:
# npm install --production (仅当 package.json 变了)

pm2 restart poetry-server
pm2 status

# ============================================
# 第四步：DNS 解析
# ============================================

# 在域名管理后台添加 A 记录:
#   主机记录: poetry
#   记录类型: A
#   记录值:   <ECS 公网 IP>

# 验证 DNS 生效:
nslookup poetry.yukinova.top

# ============================================
# 第五步：功能验证
# ============================================

# 主工具页面
curl -I http://poetry.yukinova.top/

# 管理后台
curl -I http://poetry.yukinova.top/admin/

# API
curl http://poetry.yukinova.top/api/health

# 如果已配置 HTTPS:
curl -I https://poetry.yukinova.top/
```

### 5.3 博客侧清理（可选）

独立站点上线后，原博客中的嵌入页面可以选择：

| 方案 | 操作 |
|---|---|
| **保留重定向** | 在 Hexo `source/poetry/index.md` 中添加 `<meta http-equiv="refresh" content="0;url=https://poetry.yukinova.top/">` |
| **保留并存** | 博客继续嵌入 UMD 版本，新站点独立运行（双轨） |
| **直接删除** | 删除 `source/poetry/index.md`，重新 `hexo g -d` |

建议采用**保留重定向**，不会丢失已有的博客读者。

### 5.4 HTTPS 配置（Certbot）

```bash
# 安装 certbot (如未安装)
apt install certbot python3-certbot-nginx

# 为独立站点申请证书
certbot --nginx -d poetry.yukinova.top

# certbot 会自动修改 nginx 配置，添加 SSL 相关指令
# 验证自动续期
certbot renew --dry-run
```

---

## 6. 改造影响评估

### 6.1 哪些被影响

| 模块 | 影响程度 | 说明 |
|---|---|---|
| `tool/vite.config.js` | 🔴 重写 | UMD→SPA，删除 lib 和 define 配置 |
| `tool/src/main.js` | 🟡 简化 | 删除 `window.PoetryTool`，改挂载点 |
| `tool/src/App.vue` | 🟢 微调 | 根 CSS 选择器改名 |
| `tool/index.html` | 🟢 新增 | 参考 admin 模板 |
| `admin/vite.config.js` | 🟢 微调 | 添加 `base: '/admin/'` |
| `deploy/nginx.conf` | 🔴 重写 | 新的 server block |
| `server/` | ⚪ 不变 | 纯 API，不感知前端部署 |
| `shared/` | ⚪ 不变 | 跨模块 schema |

### 6.2 哪些不变

- 所有分析引擎 (`core/`)
- 所有静态数据 (`data/`)
- 所有业务逻辑 (`composables/`)
- 所有 UI 组件 (`components/`)
- 后端代码 (`server/`)
- 数据库 (`cipai.db`)
- 数据导入脚本 (`scripts/`)

---

## 7. 时间估算

| 阶段 | 预估时间 | 内容 |
|---|---|---|
| 代码改造 | 30 min | 4-6 个文件修改 |
| 本地构建验证 | 15 min | 构建 + 预览 |
| 服务器部署 | 20 min | 上传 + Nginx + DNS |
| 功能验证 | 15 min | 全面测试 |
| **总计** | **~1.5 h** | |

---

## 8. 回滚方案

如果独立站点出现问题，可以立即回滚：

```bash
# 恢复旧 Nginx 配置
ssh root@<IP>
cp /etc/nginx/conf.d/poetry.conf.bak /etc/nginx/conf.d/poetry.conf
nginx -t && nginx -s reload

# DNS 记录保持不动(指向博客主域即可)
```

原有博客嵌入方式不受任何影响——`tool/dist/poetry-tool.js`（旧 UMD 构建）只要不被覆盖，博客页面功能正常。部署时建议先备份：

```bash
# 部署前备份
ssh root@<IP> "cp -r /var/www/poetry-tool/tool/dist /var/www/poetry-tool/tool/dist.bak"
```
