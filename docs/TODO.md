# 待办清单（TODO）

> 生成日期：2026-08-01 · 更新：2026-08-02（C+ 完成、词牌数据收敛）
> 状态图例：`[ ]` 待办 · `[x]` 已完成 · 优先级 P0 紧急 / P1 常规 / P2 可选

---

## A. 收尾与运维（遗留待办，需确认）

- [ ] **A1 (P0) 推送 Git**：本轮大改（爬虫 + 多格式模型 + 前端变体切换）待整理提交并推送
- [ ] **A2 (P1) 博客旧路径重定向**：`yukinova.top/poetry/` → `poetry.yukinova.top`（session-progress 遗留）
- [ ] **A3 (P1) 服务器 .env 核对**：确认 `JWT_SECRET` / `ADMIN_PASSWORD` 已设置且为强密码（README 标注生产必改）
- [ ] **A4 (P1) 生产部署同步**：ECS `poetry.yukinova.top` 需更新——server 代码（formats 支持）+ 新 `cipai.db`（153 词牌，本地已删旧数据）+ tool/admin 最新构建
- [ ] **A5 (P2) 更新文档**：`docs/session-progress-20260723.md` 的"待办事项"与部署状态已过时，可并入本清单

## B. 前端功能增强（tool/）— ✅ 2026-08-01 已完成

- [x] **B1 平仄格律预览界面**：新增 `PatternPreview.vue`（只读字格：平/仄/中/韵 + 韵脚标签 + 句号 + 字数句数，点击字格跳转编辑器；可折叠）
- [x] **B1.5 预览跳转自动补行**：点击未创建的行 → 自动补空行至目标行（如第 1 行点第 8 行 → 自动创建 1~8 行）
- [x] **B2 多音字候选点击替换**：tooltip 候选可点击 → `setToneOverride` 固定该字声调参与格律匹配（文本不变，读音覆盖按 line:col + 字符校验，编辑后自动失效）
- [x] **B3 移动端适配**：≤640px 编辑器 20px→16px（高亮层/输入层/行号同步 1.875 行高），tooltip 防溢出 + max-width，搜索框/下拉/韵书按钮响应式
- [x] **B4 草稿自动保存**：`useDraft.js`（400ms debounce，localStorage `poetry-draft:v1`，存 text/patternId/rhymeBook，空文本自动清除）+ 恢复提示条/清空按钮
- [x] **B5 多格式变体切换**：词牌单条目多格式模型（server `formats` 列 + schema 校验 + admin 兼容兜底），PatternPreview 顶部「变体」按钮组切换（临江仙 4 格 / 木兰花 5 格等 36 个词牌）
- [ ] **B6 (P2) 作品导出**：格律标注版文本 / 图片分享（canvas 渲染）
- [ ] **B7 (P2) 键盘快捷键**：切换韵书、清空、跳到下一个错误（F8 类）等
- [ ] **B8 (P2) 历史记录**：本地保存多篇草稿，可切换/恢复

## C. 架构与工程（跨模块）

- [ ] **C1 (P1) 词牌数据离线兜底**：`useCipai` 强依赖 `GET /api/cipai`，后端不可用时词牌选择器完全不可用。方案：前端打包精简目录（龙榆生 153 词牌目录，约 50KB），按需请求单个词牌格律；或后端不可用时降级提示 + 诗体模板可用
- [ ] **C2 (P2) 补充 composables/组件测试**：现有 33 用例仅覆盖 `core/` 三个引擎；`useAnalysis`/`usePattern`/`useCipai` 及 PoetryIDE 交互逻辑无测试
- [ ] **C3 (P2) CI 接入**：GitHub Actions — push 触发 `cd tool && npm test && npm run build`，双端构建产物校验
- [ ] **C4 (P2) 依赖与安全巡检**：`npm audit` 三端（tool/admin/server）；确认 better-sqlite3 版本兼容 Node 24
- [ ] **C5 (P2) 错误边界与降级**：后端 500 / 网络断开的用户提示（当前仅 console.error）；`/api/health` 前端探活

## C+. 数据校正（龙榆生爬虫）— ✅ 2026-08-02 完成

- [x] **抓取**：153 词牌全量抓取成功（`longyusheng_crawler/output/html_cache/`，GB2312 解码）
- [x] **解析**：153 词牌零警告（`ping/ze/zhong/yun0` 标记、逗号拆句、双调分片、叠句 note、别名/简介/注释）
- [x] **导出**：单条目多格式模型（`longyusheng_cipai_schema.json`，36 个多格式词牌，重复标签去重如满江红变格二）
- [x] **对比**：`cipai_diff_report.md`（150 匹配 / 143 差异 / 7 新增）
- [x] **导入**：`direct-import.py` 幂等 upsert（备份 → 新增 7 → 覆盖 146 → 总数 825）
- [x] **数据收敛**：删除 672 个未覆盖的搜韵旧数据词牌 → 库内仅保留 **153 个龙榆生权威词牌**（备份 `cipai.db.20260802001933.bak`）
- [x] **旧数据源废止**：`scripts/import-cipai.js` 标注废止（Ci_Tunes.json 仅作对比参考）；README/TODO 已同步
- [ ] **韵书/平仄字典校正（M6，第二阶段）**：龙榆生词牌谱反推平仄 → 与 tones.json 对照出疑点清单（只报告不自动改）；平水韵/词林正韵权威刻本核对

## D. 数据与内容

- [ ] **D1 (P1) 存量词牌扩展**：龙榆生仅 153 常用词牌，如需全量词谱可再爬权威源（如钦定词谱）补充
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
| 词牌导入 | `cd longyusheng_crawler && python direct-import.py --dry` | 幂等 upsert，自动备份 |
