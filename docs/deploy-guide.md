# 独立站点部署指南

> **服务器**: <ECS_IP> / 阿里云 ECS / Ubuntu 22.04 / 宝塔面板  
> **原项目**: https://yukinova.top/poetry/ (Hexo 博客嵌入)  
> **目标**: 部署为独立站点 https://poetry.yukinova.top

---

## 1. 服务器环境

| 项目 | 值 |
|---|---|
| IP | `<ECS_IP>` |
| 面板 | 宝塔面板 |
| 系统 | Ubuntu 22.04 |
| 项目路径 | `/var/www/poetry-tool/` |
| 后端端口 | `3001` |
| 进程管理 | PM2 (`poetry-server`) |
| 域名 | 当前 `yukinova.top/poetry/` → 目标 `poetry.yukinova.top` |

### 当前 Nginx 路由

```
admin.yukinova.top       → /var/www/poetry-tool/admin/dist
yukinova.top/poetry      → /var/www/poetry-tool/tool/dist (旧 UMD)
yukinova.top/api         → proxy_pass 127.0.0.1:3001
```

## 2. 代码改造（已完成 ✅）

以下改动已在本地完成，直接可用：

| 文件 | 改动 |
|---|---|
| `tool/index.html` | 新建 SPA 入口 |
| `tool/vite.config.js` | UMD → SPA 模式 |
| `tool/src/main.js` | 挂载 `#app` |
| `tool/src/App.vue` | CSS 选择器 + 山影配色 |
| `admin/vite.config.js` | `base: '/admin/'` |
| `deploy/nginx.conf` | 独立站点配置 |

## 3. 构建产物

在本地项目根目录执行：

```bash
# tool (SPA)
cd tool && npm run build
# → dist/index.html + dist/assets/index-xxx.js + dist/assets/index-xxx.css

# admin (SPA, base=/admin/)
cd ../admin && npm run build
# → dist/index.html + dist/assets/...
```

## 4. 服务器部署步骤

### 4.1 上传文件

```powershell
# Windows PowerShell — 在项目根目录执行

$IP = "<ECS_IP>"

# tool SPA 产物
scp -r tool/dist/* root@${IP}:/var/www/poetry-tool/tool/dist/

# admin SPA 产物
scp -r admin/dist/* root@${IP}:/var/www/poetry-tool/admin/dist/

# server 代码（auth.js 修复）
scp server/middleware/auth.js root@${IP}:/var/www/poetry-tool/server/middleware/
scp server/routes/auth.js    root@${IP}:/var/www/poetry-tool/server/routes/

# Nginx 配置
scp deploy/nginx.conf root@${IP}:/var/www/poetry-tool/deploy/
```

### 4.2 宝塔面板 — 新建站点

1. 登录宝塔面板 → **网站** → **添加站点**
2. 填写：
   - 域名：`poetry.yukinova.top`
   - 根目录：`/var/www/poetry-tool/tool/dist`
   - PHP 版本：**纯静态**
3. 点击提交

### 4.3 宝塔面板 — 配置 Nginx

在宝塔面板 → 网站 → `poetry.yukinova.top` → **配置文件**，替换为：

```nginx
server {
    listen 80;
    server_name poetry.yukinova.top;

    # 管理后台
    location /admin/ {
        alias /var/www/poetry-tool/admin/dist/;
        try_files $uri $uri/ /admin/index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 主工具 SPA
    location / {
        root /var/www/poetry-tool/tool/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

保存后宝塔会自动重载 Nginx。

### 4.4 重启后端

```bash
ssh root@<ECS_IP>

# 重启 PM2
pm2 restart poetry-server
pm2 status

# 确认后端正常
curl http://127.0.0.1:3001/api/health
# → {"code":0,"data":{"status":"ok",...}}
```

### 4.5 SSL 证书（宝塔面板）

1. 宝塔面板 → 网站 → `poetry.yukinova.top` → **SSL**
2. 选择 **Let's Encrypt** → 申请证书
3. 勾选 **强制 HTTPS**

### 4.6 DNS 解析

在域名管理后台添加 A 记录：

| 主机记录 | 类型 | 记录值 |
|---|---|---|
| `poetry` | A | `<ECS_IP>` |

验证 DNS 生效：
```bash
nslookup poetry.yukinova.top
```

### 4.7 功能验证

```bash
# 主页面
curl -I https://poetry.yukinova.top/

# 管理后台
curl -I https://poetry.yukinova.top/admin/

# API
curl https://poetry.yukinova.top/api/health

# 词牌列表
curl https://poetry.yukinova.top/api/cipai
```

## 5. 配置环境变量（生产）

确保服务器上 `/var/www/poetry-tool/server/.env` 存在：

```env
PORT=3001
JWT_SECRET=<随机字符串>
ADMIN_PASSWORD=<强密码>
```

如不存在则需要创建：
```bash
ssh root@<ECS_IP>
cat > /var/www/poetry-tool/server/.env << 'EOF'
PORT=3001
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=请修改为你的密码
EOF
pm2 restart poetry-server
```

## 6. 博客侧 — 添加重定向

原 Hexo 博客 `source/poetry/index.md`，在文件开头添加：

```html
<meta http-equiv="refresh" content="0;url=https://poetry.yukinova.top/" />
```

重新部署博客：
```bash
cd PortableHexo/blog && hexo g && hexo d
```

这样访问 `https://yukinova.top/poetry/` 的用户会自动跳转到新站点。

## 7. 服务器目录结构

```
/var/www/poetry-tool/
├── tool/
│   └── dist/              ← tool SPA (index.html + assets/)
├── admin/
│   └── dist/              ← admin SPA (index.html + assets/)
├── server/
│   ├── app.js             ← Express 入口
│   ├── .env               ← 环境变量
│   ├── data/cipai.db      ← SQLite 数据库
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   └── node_modules/
├── deploy/
│   ├── nginx.conf
│   └── ecosystem.config.js
├── shared/
└── scripts/
```

## 8. 常用运维命令

```bash
ssh root@<ECS_IP>

# 查看服务状态
pm2 status

# 查看日志
pm2 logs poetry-server --lines 30

# 重启服务
pm2 restart poetry-server

# 数据库备份
cp /var/www/poetry-tool/server/data/cipai.db \
   /var/www/poetry-tool/server/data/cipai.db.$(date +%Y%m%d).bak

# 更新前端（本地构建后）
# PowerShell 本地执行：
scp -r tool/dist/* root@<ECS_IP>:/var/www/poetry-tool/tool/dist/
scp -r admin/dist/* root@<ECS_IP>:/var/www/poetry-tool/admin/dist/
```

## 9. 回滚方案

```bash
ssh root@<ECS_IP>

# 恢复备份的 Nginx 配置（宝塔面板中有历史版本备份）
# 或在宝塔面板 → 网站 → 配置文件 → 手动恢复

# 旧博客嵌入方式不受影响
# 只要 /var/www/poetry-tool/tool/dist 不被覆盖，
# yukinova.top/poetry 路由仍能正常工作
```
