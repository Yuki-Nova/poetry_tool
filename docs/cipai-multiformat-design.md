# 词牌多格式数据模型方案（变体/别格归并）

> 需求：相同词牌名的不同格式（格一/格二/变格/别格/双调…）归并为一个词牌条目；
> 前端搜索选择词牌后，在平仄预览栏内切换变体。
> 后端 cipai ID 唯一对应词牌名，不因变体分裂。
> 状态：方案（待批准），2026-08-01

---

## 一、核心设计：单条目 + formats 数组

```
词牌 = 一个 ID + 一个 name + N 个格式
```

```jsonc
{
  "id": "linjiangxian",          // ← ID 唯一，对应词牌名，不因变体分裂
  "name": "临江仙",
  "alias": ["庭院深深"],
  "charCount": 58,               // 主格式字数（兼容旧字段）
  "sentences": [ ... ],          // 主格式格律（兼容旧字段，旧代码零改动）
  "formats": [                   // 全部格式（含主格式 + 变体）
    { "label": "格一",   "planSegments": 2, "sentences": [ ... ] },   // = 主格式
    { "label": "格二",   "planSegments": 2, "sentences": [ ... ] },
    { "label": "格三",   "planSegments": 2, "sentences": [ ... ] },
    { "label": "格四（仙吕调慢曲）", "planSegments": 2, "sentences": [ ... ] }
  ],
  "notes": "…"
}
```

**关键决策**：
1. **`sentences` 保留 = `formats[0].sentences` 冗余** → 现有 server/tool/admin 全部旧逻辑无感（读 sentences 即主格式）
2. **`formats` 为可选字段**：单格式词牌可以没有 formats（或 formats 长度 1），零成本兼容存量 818 词牌
3. **`label` 直接复用龙榆生标注**（格一/格二/变格/别格/双调/定格…），满江红式重复标签由导出脚本去重命名（变格二/变格三）

## 二、数据层改动（server）

### 2.1 表结构：新增列

```sql
ALTER TABLE cipai ADD COLUMN formats TEXT NOT NULL DEFAULT '[]';
```

- `models/cipai.js`：`rowToCipai` 解析 formats；`create`/`update` 支持 formats（缺省 '[]'）
- 向后兼容：旧数据行 formats='[]' → 前端视为单格式

### 2.2 API

- `GET /api/cipai`：返回含 formats 的完整对象（list 已有，无需改路由）
- `POST/PUT /api/cipai`：接收可选 formats 字段

### 2.3 shared/cipaiSchema.js（三端共用校验）

```js
// formats 可选；若存在：
//   - 数组，每项 { label: string, planSegments?: number, sentences: [{index,length,pattern,isRhyme,rhymeType}] }
//   - formats[0].sentences 与顶层 sentences 一致（若顶层存在）
//   - 每项 sentences 校验复用现有 validateCipai 的句子检查逻辑
```

## 三、前端改动（tool）

### 3.1 交互流程

```
搜索框选「临江仙」 → 选中词牌（ID=linjiangxian）
  → PatternPreview 顶部出现变体选择器（格一/格二/格三/格四 下拉或分段按钮）
  → 切换 → 预览格律、编辑器分析同步使用该格式
```

### 3.2 数据流

```
useCipai → list（含 formats）
usePattern:
  currentPattern = { ...cipai, formats }          // 原样透传
  formatIndex = ref(0)                            // 当前变体序号
  activePattern = computed(() => ({
    ...currentPattern,
    sentences: currentPattern.formats?.[formatIndex]?.sentences ?? currentPattern.sentences
  }))                                             // 分析用
PatternPreview:
  props: pattern(formats), formatIndex
  渲染: 变体选择器（label 列表）+ 当前格式字格
  emit: change-format(index)
App.vue:
  @change-format → formatIndex = index
  useAnalysis(inputText, activePattern, rhymeBook)  // 自动重分析
```

- `useAnalysis` **零改动**（它只消费 pattern.sentences，activePattern 已替换）
- 单格式词牌：formats 为空/长度 1 → 选择器不显示，完全走旧路径

### 3.3 admin 后台

- `CipaiList/CipaiEditor` **暂不支持 formats 编辑**（保持只读写主格式 sentences，formats 字段透传不破坏）
- 后续迭代可在 PatternGrid 旁加格式 tab（不在本期范围）

## 四、导入调整（M5 衔接）

- `longyusheng_crawler/export.py`：**不再展开 -vN 条目**
  - 每个词牌输出 1 条：主格式进 sentences + 全部格式进 formats
  - 重复标签去重逻辑保留（在 formats label 内去重）
- 导入：主条目 id 与现库一致 → UPDATE 覆盖（含 formats 列）；仅龙榆生有 → INSERT
- 预期结果：词牌总数 ≈ 818 + 3（江南春/夜飞鹊/木兰花 新增）≈ 821，**不产生 -vN 分裂条目**

## 五、与现有代码的兼容性清单

| 模块 | 影响 | 处理 |
|---|---|---|
| tool 旧逻辑（useAnalysis/Editor*） | 无 | sentences 字段未变 |
| tool PatternSelector（搜索） | 无 | 还是按词牌列表搜索 |
| admin 后台 | 无破坏 | formats 列透传忽略 |
| server CRUD | 小改 | models 增 formats 读写 |
| shared schema | 小改 | formats 可选校验 |
| 存量 818 词牌 | 无迁移 | formats 默认 '[]' |

## 六、风险与注意

1. **主格式选择**：formats[0] = 龙榆生页第一个格式（多为定格/格一），与现库主格式可能不同 → 导入后主格式被龙榆生格一覆盖，用户可在预览栏切换回来（行为可接受，且比现库更权威）
2. **前端切换变体时输入文本不重置**（字数列变化，多余字分析为 unknown——现状逻辑已处理）
3. **admin 编辑多格式**：本期不做，如需修改变体只能重新导入/手改 db（文档说明）
4. **变体 label 规范**：采用龙榆生原标签，不翻译（格一/格二/变格/别格/双调/慢曲…），用户辨识度最高

## 七、实施步骤（批准后）

```
M5a  server: cipai 表加列 + models 支持 formats + shared schema 校验
M5b  export.py: 合并输出（1 词牌 1 条目含 formats）
M5c  本地验证：validate 报告（单格式对比逻辑不变，formats 只透传）
M5d  备份 cipai.db → 导入（API 或直写）
M5e  tool: usePattern activePattern + PatternPreview 变体选择器
M5f  构建 + 浏览器验证（临江仙/满江红/木兰花切换）
```
