# 开发进展记录 — 2026-07-22 / 07-23

> 本轮对话的完整进度总结，涵盖从架构探索到生产部署的全过程。

---

## 一、项目理解与文档体系建设

### 1.1 项目结构探索

- 通读 `README.md`、`tree.txt`、`package.json` 及各子目录结构
- 使用 3 个并行 Explore agent 深入分析代码：
  - 核心引擎层（`toneAnalyzer` / `rhymeChecker` / `patternMatcher`）
  - 数据流（`shared/cipaiSchema` → `server/routes` → `tool/composables`）
  - 管理后台与导入脚本
- 确认 8 个模块：`tool/` `admin/` `server/` `shared/` `deploy/` `scripts/` `prototype/` `chinese_word_rhyme-main/`

### 1.2 新建文档目录

- 创建 `docs/` 文件夹及索引 `README.md`
- 撰写 5 份技术文档：

| 文档 | 内容 |
|---|---|
| `docs/README.md` | 文档目录索引 |
| `docs/realtime-analysis-design.md` | 实时分析架构——核心数据结构、组件拆分方案、引擎绑定策略 |
| `docs/standalone-migration-plan.md` | 独立化改造——耦合分析、架构对比、代码改动清单 |
| `docs/deploy-guide.md` | 生产部署指南——服务器信息、宝塔面板操作、完整命令 |
| `docs/session-progress-20260723.md` | 本文档——本轮开发进展 |

---

## 二、独立化改造：从博客嵌入到独立站点

### 2.1 耦合分析

原有 7 个耦合点：

| 耦合点 | 改造方式 |
|---|---|
| UMD Library 构建 | → SPA 模式 |
| 无独立 HTML | → 新建 `tool/index.html` |
| `window.process` polyfill | → 删除 |
| `window.PoetryTool` 全局 API | → 删除 |
| 根选择器 `#poetry-tool` | → `#app` |
| Nginx 路径 `/poetry/` | → `poetry.yukinova.top` 独立域名 |
| 跨域 CORS | → 同域部署 |

### 2.2 代码改动

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `tool/index.html` | **新建** | SPA 入口 |
| `tool/vite.config.js` | 重写 | 删除 `lib` + `define`，标准 SPA 模式 |
| `tool/src/main.js` | 简化 | `#poetry-tool` → `#app`，删除全局挂载 |
| `tool/src/App.vue` | 修改 | CSS 选择器 + 山影配色 + 韵书选择移至顶栏 |
| `admin/vite.config.js` | 微调 | `base: '/admin/'` → `/`（独立子域名后还原） |
| `deploy/nginx.conf` | 重写 | 两个独立 server block |
| `deploy/ecosystem.config.js` | 修改 | 路径 → `/www/wwwroot/poetry/`，端口 → `3002` |

---

## 三、IDE 编辑器重构

### 3.1 架构设计

采用 **透明 textarea 覆盖高亮 div** 模式（CodeMirror/Monaco 同款方案）：

```
PoetryIDE.vue (容器)
├── EditorStatusBar.vue    格律名 + 统计
├── EditorGutter.vue       行号 + 断点红点 + 错误标记
├── EditorHighlightLayer.vue  逐字着色层(底层)
├── EditorTextarea.vue     透明输入层(上层, z-index:2)
└── EditorTooltip.vue      悬浮错误提示(Teleport to body)
```

### 3.2 新建组件

| 组件 | 职责 |
|---|---|
| `PoetryIDE.vue` | 统一编辑器容器，协调子组件 |
| `EditorGutter.vue` | 行号、错误红点、断点红点 |
| `EditorHighlightLayer.vue` | `span` 逐字渲染，状态驱动 CSS 类 |
| `EditorTextarea.vue` | `color:transparent` 透明输入层，IME 内化处理 |
| `EditorTooltip.vue` | `Teleport to body` 悬浮提示，含多音字候选 |
| `EditorStatusBar.vue` | 格律名、类型标签、字数/正确/出律/多音统计 |

### 3.3 分析管线优化

| 版本 | 策略 | 问题 |
|---|---|---|
| v1 (原始) | 200ms debounce | 感知延迟 |
| v2 | rAF 节流 | 快速输入丢帧 |
| v3 (最终) | **同步 watch** | <1ms 无感知延迟，每次输入即时分析 |

### 3.4 IME 中文输入修复

**问题**：中文输入不触发实时分析；英文正常。

**根因**：
1. `compositionend` 事件中 `update:modelValue` 先于 `composition-end` emit → watch 触发时 `isComposing` 仍为 `true` → 分析被跳过
2. 部分浏览器 `compositionend` 后不再触发额外 `input` 事件

**修复**：
- IME 状态完全内化到 `EditorTextarea.vue`
- 组合期间 `onInput` 不 emit → 拼音不出 textarea
- `compositionend` 后才 emit 确认后的汉字文本
- `useAnalysis.js` 删除 `isComposing` 检查，收到文本即分析

### 3.5 其他修复

| 问题 | 修复 |
|---|---|
| 高亮层字符与背景同色 | `.highlight-layer` 的 `color:transparent` → `var(--ink)` |
| `scheduleAnalysis is not defined` | return 语句删除已移除函数的引用 |
| `Property "off" was accessed during render` | `:autocomplete="off"` → `autocomplete="off"` |

### 3.6 断点功能

- 点击行号 → 切换红点断点（断点行号隐藏，红点替换行号位置）
- 断点存储在 `reactive(new Set())`

---

## 四、前端重设计：山影风格

### 4.1 配色体系对比

| 变量 | 旧 (墨韵) | 新 (山影) |
|---|---|---|
| `--paper` | `#faf7f2` 暖宣纸 | `#f5f4f0` 冷白瓷 |
| `--ink` | `#2c2416` 暖墨 | `#1a1c1d` 冷墨 |
| `--accent` | `#8b4513` 赭石棕 | `#3d5a80` **远山蓝** |
| `--ping-bg` | `#eaf0f6` | `#edf1f5` |
| `--error-text` | `#c7513b` | `#c04a3a` 朱砂 |
| `--rhyme-border` | `#c8963e` | `#b8954a` 暖金 |
| `--success` | `#5b8c5a` | `#5b8c7e` **青瓷绿** |

### 4.2 字体策略

| 区域 | 字体 |
|---|---|
| UI chrome（标签/按钮/状态栏） | sans-serif (Inter / PingFang SC) |
| 诗词正文 / 标题 | serif (Noto Serif SC) |

### 4.3 改动文件（tool: 11 个，admin: 6 个）

**tool 前端**：`App.vue` + `PoetryIDE.vue` + `EditorGutter.vue` + `EditorHighlightLayer.vue` + `EditorStatusBar.vue` + `EditorTooltip.vue` + `EditorTextarea.vue` + `PatternSelector.vue` + `RhymeHint.vue` + `ErrorPanel.vue` + `CharToken.vue`（保留未改动）

**admin 管理后台**：`App.vue` + `Login.vue` + `CipaiList.vue` + `CipaiEditor.vue` + `PatternGrid.vue` + `PreviewPane.vue`

---

## 五、后端修复

### 5.1 模块加载致命错误

**问题**：`auth.js` 在模块顶层检查 `JWT_SECRET` 和 `ADMIN_PASSWORD`，无 `.env` 时 `throw Error` 导致整个 server 无法加载 → `GET /api/cipai` 返回 500。

**修复**：环境变量检查从模块顶层移到函数内延迟执行：
- `middleware/auth.js`：`JWT_SECRET` → `getSecret()` 函数内检查
- `routes/auth.js`：`ADMIN_PASSWORD` → `getPassword()` 函数内检查

### 5.2 端口冲突

- `herb-qa-api` 已占用 3001 端口 → poetry-server 改用 **3002** 端口

---

## 六、生产部署

### 6.1 服务器信息

| 项目 | 值 |
|---|---|
| IP | `<ECS_IP>` |
| 面板 | 宝塔面板 |
| 系统 | Ubuntu 22.04 / 阿里云 ECS |
| 项目路径 | `/www/wwwroot/poetry/` |
| Node.js | v24.16.0 |

### 6.2 站点架构

```
poetry.yukinova.top      → /www/wwwroot/poetry/tool/dist     (填词工具)
admin.poetry.yukinova.top → /www/wwwroot/poetry/admin/dist    (管理后台)
/api/                     → proxy_pass 127.0.0.1:3002         (Express API)
```

### 6.3 部署状态

| 组件 | 状态 |
|---|---|
| 后端 Express `:3002` (PM2) | ✅ online |
| Nginx 路由 | ✅ 已配置 |
| SSL (Let's Encrypt) | ✅ 已启用 |
| DNS `poetry.yukinova.top` | ✅ 已解析 |
| DNS `admin.poetry.yukinova.top` | ✅ 已解析 |
| 主工具页面 | ✅ 正常 |
| 管理后台页面 | 待上传新构建 |

### 6.4 运维命令

```bash
# 查看服务
pm2 status
pm2 logs poetry-server --lines 30

# 重启
pm2 restart poetry-server

# 更新前端（本地构建后）
scp -r tool/dist/* root@<ECS_IP>:/www/wwwroot/poetry/tool/dist/
scp -r admin/dist/* root@<ECS_IP>:/www/wwwroot/poetry/admin/dist/
```

---

## 七、工具脚本

| 文件 | 用途 |
|---|---|
| `dev.bat` | Windows 一键启动前后端 |
| `dev.sh` | Bash/Git Bash/ macOS/Linux 一键启动前后端 |

---

## 八、构建产物

| 模块 | JS | CSS | HTML |
|---|---|---|---|
| tool | ~324 KB (gzip 125 KB) | ~12 KB (gzip 3 KB) | index.html |
| admin | ~154 KB (gzip 58 KB) | ~14 KB (gzip 3 KB) | index.html |

---

## 九、待办事项

- [ ] 上传最新 admin 构建到服务器
- [ ] 验证 `admin.poetry.yukinova.top` 可访问
- [ ] 博客原 `yukinova.top/poetry/` 添加重定向到新站点
- [ ] 创建 `server/.env` 设置 JWT_SECRET 和 ADMIN_PASSWORD
- [ ] 导入词牌数据：`node scripts/import-cipai.js`
