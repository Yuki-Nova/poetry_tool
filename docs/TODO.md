# 待办清单（TODO）

> 生成日期：2026-08-01
> 状态图例：`[ ]` 待办 · `[x]` 已完成 · 优先级 P0 紧急 / P1 常规 / P2 可选

---

## A. 收尾与运维（遗留待办，需确认）

- [ ] **A1 (P0) 推送 Git**：master 领先 origin 2 个提交（`0e852ec` fix 行号定位/韵脚判定、`74b41fe` test 33 用例），未推送到 GitHub
- [ ] **A2 (P1) 博客旧路径重定向**：`yukinova.top/poetry/` → `poetry.yukinova.top`（session-progress 遗留）
- [ ] **A3 (P1) 服务器 .env 核对**：确认 `JWT_SECRET` / `ADMIN_PASSWORD` 已设置且为强密码（README 标注生产必改）
- [ ] **A4 (P1) 线上状态确认**：admin.poetry.yukinova.top 构建是否为最新；服务器 `cipai.db` 词牌数（本地 817，README 称 818）
- [ ] **A5 (P2) 更新文档**：`docs/session-progress-20260723.md` 的"待办事项"与部署状态已过时，可并入本清单

## B. 前端功能增强（tool/）

- [ ] **B1 (P1) 多音字候选点击替换**：`EditorTooltip.vue` 目前 `pointer-events: none` 只展示候选读音（reading/tone/meaning），无法交互；可点击候选 → 替换编辑器对应字 → 更新分析
- [ ] **B2 (P1) 草稿自动保存**：输入文本 + 当前词牌 + 韵书选择存 localStorage，刷新/误关不丢稿
- [ ] **B3 (P1) 词牌详情展示**：选中词牌后展示字数/句数/韵部/代表例词（数据源 `chinese_word_rhyme-main/data/Ci_Catalog.json`，仅 78 KB 可打包进前端）
- [ ] **B4 (P2) 移动端适配**：行号 + 高亮层 + 透明 textarea 的 IDE 布局在窄屏的体验验证与响应式调整
- [ ] **B5 (P2) 作品导出**：格律标注版文本 / 图片分享（canvas 渲染）
- [ ] **B6 (P2) 键盘快捷键**：切换韵书、清空、跳到下一个错误（F8 类）等
- [ ] **B7 (P2) 历史记录**：本地保存多篇草稿，可切换/恢复

## C. 架构与工程（跨模块）

- [ ] **C1 (P1) 词牌数据离线兜底**：`useCipai` 强依赖 `GET /api/cipai`，后端不可用时词牌选择器完全不可用。方案：前端打包精简目录（Ci_Catalog 78KB），按需请求单个词牌格律；或后端不可用时降级提示 + 诗体模板可用
  - 注：`Ci_Tunes.json` 全量 19 MB，不适合整体打包进前端
- [ ] **C2 (P2) 补充 composables/组件测试**：现有 33 用例仅覆盖 `core/` 三个引擎；`useAnalysis`/`usePattern`/`useCipai` 及 PoetryIDE 交互逻辑无测试
- [ ] **C3 (P2) CI 接入**：GitHub Actions — push 触发 `cd tool && npm test && npm run build`，双端构建产物校验
- [ ] **C4 (P2) 依赖与安全巡检**：`npm audit` 三端（tool/admin/server）；确认 better-sqlite3 版本兼容 Node 24
- [ ] **C5 (P2) 错误边界与降级**：后端 500 / 网络断开的用户提示（当前仅 console.error）；`/api/health` 前端探活

## D. 数据与内容

- [ ] **D1 (P1) 词牌数据完整性核对**：本地 `cipai.db` 817 条 vs 上游 `Ci_Tunes.json`（README 声称 818），差异定位
- [ ] **D2 (P2) 韵书数据核对**：上游 `Word_Tune.json`（145KB）与前端 `xinyun/pingshui/cilin` 三部韵书的一致性抽查
- [ ] **D3 (P2) 常见多音字补充**：`custom.json` 与 `tones.json` 的「多」标注持续校准（已有 7 字修正先例，可建回归测试防止回退）

---

## 快速参考

| 模块 | 命令 | 说明 |
|---|---|---|
| 测试 | `cd tool && npm test` | vitest，当前 33 用例全绿 |
| 构建 | `cd tool && npm run build` | → tool/dist/ |
| 后端 | `cd server && npm run dev` | 端口 3001（生产 3002） |
| 本地三端 | `dev.bat` | server 3001 / tool 5174 / admin 5173 |
