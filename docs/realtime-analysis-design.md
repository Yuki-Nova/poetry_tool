# 实时分析 + 高亮功能架构设计

> 目标：将填词工具的输入体验改造为类 IDE 风格——在输入框中逐字实时高亮，错误即时可视反馈。

---

## 1. 现状分析

### 1.1 当前架构（两区分离模式）

```
┌─── PatternSelector ──────────────────────────┐
│  [搜索框] 选择词牌/诗体                          │
└──────────────────────────────────────────────┘
┌─── PoetryEditor ─────────────────────────────┐
│  ┌── textarea ────────────────────────────┐  │
│  │  用户在此输入诗文...                       │  │
│  │                                          │  │
│  └──────────────────────────────────────────┘  │
│  统计: 字符数 / 正确 / 错误 / 多音字             │
│                                                 │
│  ┌── 格律网格 (pattern view) ────────────────┐  │
│  │  [平][仄][平][平][仄]  ← 模板预览           │  │
│  │  [春][眠][不][觉][晓]  ← CharToken 着色     │  │
│  │  [平][平][仄][仄][仄]  ← 实际平仄           │  │
│  │  [蓝][蓝][白][白][红]  ← 颜色反馈           │  │
│  └──────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
┌─── RhymeHint ────────────────────────────────┐
│  押韵信息 / 韵书切换                            │
└──────────────────────────────────────────────┘
┌─── ErrorPanel ───────────────────────────────┐
│  错误列表(可折叠)                               │
└──────────────────────────────────────────────┘
```

**问题**：
- 输入区(textarea)和格律网格是分离的两个区域，用户在 textarea 打字，需要到下方网格看反馈
- 缺少"在输入位置直接看到错误"的 IDE 体验
- 反馈延迟 200ms，感知上不够即时

### 1.2 现有分析管线

```
inputText (ref)
    │
    ▼ 200ms debounce
toneAnalyzer.analyzeText()  ← tones.json + custom.json
    │
    ├──→ patternMatcher.matchPattern()  ← pattern.sentences
    │
    ├──→ rhymeChecker.checkRhyme()     ← rhymes/*.json
    │
    ▼
{ matchResults, rhymeResult, errors, stats }
    │
    ▼
PoetryEditor / CharToken / ErrorPanel / RhymeHint
```

分析管线本身设计良好，问题在于**视图层与管线的连接方式**。

---

## 2. 目标架构：IDE 风格

### 2.1 核心理念

像 VS Code / JetBrains 一样——**在同一视图中输入和查看反馈**：

- ✅ 逐字着色：平(蓝)、仄(白/灰)、多音(紫)、出律(红色波浪下划线)
- ✅ 韵脚位置：金色边框高亮
- ✅ 错误行：行号区红色标记（gutter indicator）
- ✅ 即时响应：防抖 0ms，每帧更新，感知零延迟
- ✅ IME 友好：中文输入法组合输入期间不触发分析

### 2.2 目标布局

```
┌─── PatternSelector ──────────────────────────┐
│  [搜索框] 选择词牌/诗体                          │
├──────────────────────────────────────────────┤
│  韵书: [中华新韵] [平水韵] [词林正韵]   统计信息   │
├──────────────────────────────────────────────┤
│  ┌── Gutter ──┬── Editor Area ────────────┐  │
│  │  1  ▼      │ 春 眠 不 觉 晓             │  │
│  │  2  ✗      │ 处 处 闻 啼 鸟             │  │  ← 每字独立着色
│  │  3         │ 夜 来 风 雨 声             │  │     韵脚有金色边框
│  │  4        │ 花 落 知 多 少             │  │     多音字紫色虚线
│  │            │                            │  │     出律字红色波浪线
│  │            │                            │  │
│  │            │  第2句第3字: 闻(平) → 期望仄  │  │  ← hover tooltip
│  └────────────┴────────────────────────────┘  │
│                                                │
│  ┌── Error Strip (minimap-like) ────────────┐  │
│  │  ████████████████████████████████████████ │  │
│  │  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██ │  │
│  │  ████████████████████████████████████████ │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

---

## 3. 核心数据结构

### 3.1 平仄字典 (Tone Dictionary)

```typescript
// 文件: tool/src/data/tones.json
// 8000+ 汉字 → 平仄分类
{
  [char: string]: "平" | "仄" | "多"  // "多" = 多音字
}

// 示例
{ "东": "平", "风": "平", "雪": "仄", "中": "多" }
```

**现状**: 结构合理，不改动。查找 O(1)。

### 3.2 韵书字典 (Rhyme Dictionary)

```typescript
// 文件: tool/src/data/rhymes/{xinyun|pingshui|cilin}.json
{
  name: string,                                  // 韵书名称
  groups: Array<{
    name: string,                                // 韵部名称，如 "一麻"
    chars: string[]                              // 该韵部包含的字
  }>
}

// 加载到内存后构建反向索引以加速查找:
// Map<character, rhymeGroupName>
type RhymeIndex = Map<string, string>
```

**现状**: 结构合理。**优化建议**: 启动时将 `groups[].chars[]` 展开为 `Map<char, groupName>` 反向索引，O(1) 查韵。

### 3.3 格律模板 (Pattern Template)

```typescript
// 词牌/诗体格律规则
interface PatternTemplate {
  id: string                    // 唯一标识，如 "huanxisha"
  name: string                  // 显示名称，如 "浣溪沙"
  alias: string[]               // 别名
  type: string                  // 分类: "绝句" | "律诗" | "词牌"
  charCount: number             // 总字数
  sentences: SentenceRule[]     // 逐句规则
  notes: string                 // 备注
  source: "builtin" | "api"    // 来源
}

interface SentenceRule {
  index: number                 // 句序号(0-based)
  length: number                // 本句字数
  pattern: ToneSpec[]           // 逐字平仄要求，长度 = length
  isRhyme: boolean              // 本句是否入韵
  rhymeType: "平韵" | "仄韵" | "可平可仄" | null
}

// 平仄规格枚举
type ToneSpec = "平" | "仄" | "可平可仄" | "韵脚"
```

**现状**: 8 个内置诗体 + API 获取的词牌，结构不变。

### 3.4 逐字分析结果 (Per-Character Analysis) —— 核心数据结构

```typescript
// 每个字的完整分析状态
interface CharAnalysis {
  char: string                  // 原字符
  tone: "平" | "仄" | "多音" | "?" | "skip" | "punct"
  isMulti: boolean              // 是否多音字
  
  // --- 以下由 patternMatcher 填充 ---
  expected: ToneSpec | "?"      // 期望的平仄规格
  status: CharStatus            // 匹配状态
  isRhyme: boolean              // 是否在韵脚位置
  rhymeGroup: string | null     // 所属韵部(仅韵脚位置)
}

type CharStatus =
  | "ok"          // 平仄正确
  | "tone-error"  // 出律（红色波浪线）
  | "ok-rhyme"    // 韵脚正确（金色边框）
  | "rhyme-warn"  // 韵脚错误（橙色）
  | "multi-tone"  // 多音字（紫色虚线）
  | "unknown"     // 未知字（灰色）
  | "skip"        // 跳过(空格/标点)
```

**现状**: 已存在，结构完善，不改动核心。增加 `lineIndex` 和 `colIndex` 便于定位。

### 3.5 编辑器内部状态 (Editor State) —— 新增

```typescript
// IDE 风格编辑器需要的额外状态
interface EditorState {
  // 输入
  rawText: string                     // 原始文本
  lines: string[]                     // 按行拆分
  
  // 光标/选择
  cursorLine: number                  // 当前行 (0-based)
  cursorCol: number                   // 当前列 (0-based)
  selection: { start: number, end: number } | null
  
  // IME 组合状态
  isComposing: boolean                // IME 正在组合输入中
  
  // 视图
  scrollTop: number
  gutterWidth: number
  
  // 分析结果(来自 useAnalysis)
  lineResults: CharAnalysis[][]       // 逐行逐字分析
  errors: AnalysisError[]             // 错误列表
  stats: EditorStats                  // 统计
}

interface EditorStats {
  totalChars: number
  typedChars: number
  okCount: number
  errorCount: number
  multiCount: number
  accuracy: number                    // 正确率 %
}
```

### 3.6 错误描述 (Error Descriptor)

```typescript
interface AnalysisError {
  line: number           // 行号 (1-based, 显示用)
  col: number            // 列号 (1-based)
  char: string           // 出错的字
  type: "tone" | "rhyme" | "unknown"
  severity: "error" | "warning" | "info"
  message: string        // 人类可读描述
  // 例如: "「闻」为平声字，此处格律要求仄声"
}
```

**现状**: `patternMatcher.collectErrors()` 已生成，结构不变。

### 3.7 数据流总结

```
              ┌──────────────────────┐
              │   Static Data         │
              │  ┌─────────────────┐  │
              │  │ tones.json      │  │  8000+ 字平仄字典
              │  │ rhymes/*.json   │  │  三大韵书
              │  │ shige.json      │  │  8 个内置诗体
              │  │ custom.json     │  │  用户自定义修正
              │  └─────────────────┘  │
              └──────────┬───────────┘
                         │ 一次性加载
              ┌──────────▼───────────┐
              │   Runtime Indexes     │
              │  ┌─────────────────┐  │
              │  │ toneMap:        │  │  Map<char, "平"|"仄"|"多">
              │  │ rhymeIndex:     │  │  Map<char, groupName>
              │  │ patternTemplates│  │  PatternTemplate[]
              │  └─────────────────┘  │
              └──────────┬───────────┘
                         │
  ┌──────────────────────▼──────────────────────┐
  │              Analysis Pipeline               │
  │                                              │
  │  rawText ──→ analyzeText() ──→ lineResults   │
  │                 │                            │
  │  pattern ───────┤                            │
  │                 ▼                            │
  │            matchPattern() ──→ matchResults   │
  │                 │                            │
  │                 ├──→ checkRhyme() ──→ rhyme  │
  │                 │                            │
  │                 └──→ collectErrors() ──→ errs │
  └──────────────────────┬──────────────────────┘
                         │
  ┌──────────────────────▼──────────────────────┐
  │              View Layer (NEW)                │
  │                                              │
  │  PoetryIDE (统一编辑器)                       │
  │  ├── Gutter (行号 + 错误标记)                 │
  │  ├── HighlightLayer (着色层)                  │
  │  ├── TextareaLayer (透明输入层)               │
  │  └── TooltipLayer (悬浮提示)                  │
  └──────────────────────────────────────────────┘
```

---

## 4. 前端组件拆分方案

### 4.1 拆分总览

```
App.vue
├── PatternSelector.vue          (保持不变)
├── RhymeBookBar.vue             [新增] 韵书切换栏(从RhymeHint中抽出)
├── PoetryIDE.vue                [新增/重构] 统一编辑器 → 替代 PoetryEditor
│   ├── EditorGutter.vue         [新增] 行号 + 错误标记
│   ├── EditorHighlightLayer.vue [新增] 字符着色显示层
│   ├── EditorTextarea.vue       [新增] 透明输入区
│   ├── EditorTooltip.vue        [新增] 悬浮错误提示
│   └── EditorStatusBar.vue      [新增] 底部状态栏
├── ErrorPanel.vue               (保留，简化——因为错误主要在编辑器内显示)
└── RhymeHint.vue                (保留，改为只显示韵部参考字)
```

### 4.2 各组件详细说明

#### 4.2.1 `PoetryIDE.vue` —— 核心编辑器容器

**职责**: 管理编辑器的整体布局和状态协调。

```typescript
// Props
interface PoetryIDEProps {
  modelValue: string                    // v-model: 诗文文本
  pattern: PatternTemplate              // 当前格律模板
  matchResults: CharAnalysis[][]        // 分析结果
  stats: EditorStats                    // 统计
  errors: AnalysisError[]               // 错误
  rhymeBook: string                     // 当前韵书
  disabled?: boolean
  placeholder?: string
}

// Emits
interface PoetryIDEEmits {
  'update:modelValue': (text: string) => void
  'char-click': (line: number, col: number) => void
  'error-hover': (error: AnalysisError) => void
}

// 内部状态
const isComposing = ref(false)           // IME 组合中
const cursorPos = ref({ line: 0, col: 0 })
const hoveredError = ref<AnalysisError | null>(null)
```

**关键设计**: 采用 **透明 textarea 覆盖高亮层** 的经典模式（CodeMirror/Monaco 方案）：

```
┌────────────────────────────────────┐
│  PoetryIDE (position: relative)     │
│                                     │
│  ┌── HighlightLayer ────────────┐  │
│  │  (position: absolute,         │  │
│  │   显示着色后的字符)             │  │
│  │  <span class="tone-ping">春   │  │
│  │   </span><span class="err">眠 │  │
│  │   </span>...                   │  │
│  └────────────────────────────────┘  │
│                                     │
│  ┌── TextareaLayer ─────────────┐  │
│  │  (position: absolute,         │  │
│  │   color: transparent,         │  │
│  │   caret-color: black,         │  │
│  │   接收所有键盘输入)             │  │
│  │   <textarea ... />            │  │
│  └────────────────────────────────┘  │
│                                     │
│  ┌── Tooltip ───────────────────┐  │
│  │  第2句第3字: 闻(平) → 期望仄  │  │
│  └────────────────────────────────┘  │
└────────────────────────────────────┘
```

**为什么用这个方案而不是 contentEditable**：
- `contentEditable` 在中文 IME 下有严重的组合输入问题
- `textarea` 天然支持 IME composition events
- 这是所有主流代码编辑器(Monaco/CodeMirror/ACE)的标准做法

#### 4.2.2 `EditorGutter.vue` —— 行号区

**职责**: 显示行号，标记当前行和错误行。

```
┌─────┬──────────────────┐
│  1  │ 春 眠 不 觉 晓   │
│  2 ✗│ 处 处 闻 啼 鸟   │  ← 红色 ✗ = 本句有错误
│  3  │ 夜 来 风 雨 声   │
│  4 ⚠│ 花 落 知 多 少   │  ← 黄色 ⚠ = 有警告
│     │                   │
└─────┴──────────────────┘
```

```typescript
// Props
interface GutterProps {
  lineCount: number
  errors: AnalysisError[]
  cursorLine: number
  pattern: PatternTemplate
}

// 计算: 每行的错误/警告状态
const lineStatus = computed(() => {
  // 按行聚合错误 → { line: number, maxSeverity: 'error'|'warning'|'ok' }
})
```

#### 4.2.3 `EditorHighlightLayer.vue` —— 高亮显示层

**职责**: 渲染每个字符为独立的 `<span>`，根据分析结果应用 CSS 类。

```typescript
// Props
interface HighlightLayerProps {
  lines: string[]
  lineResults: CharAnalysis[][]
  cursorPos: { line: number, col: number }
  hoveredCol: { line: number, col: number } | null
  pattern: PatternTemplate
}

// 每个字符的渲染:
// <span class="char-cell status-{status} tone-{tone} rhyme-{isRhyme}">春</span>
```

**CSS 类映射**:

| 状态 | CSS 类 | 视觉效果 |
|---|---|---|
| `ok` + 平 | `tone-ping` | 蓝色字 |
| `ok` + 仄 | `tone-ze` | 灰色字 |
| `ok-rhyme` | `tone-rhyme-ok` | 蓝色 + 金色边框 + glow |
| `rhyme-warn` | `tone-rhyme-warn` | 橙色底 |
| `tone-error` | `tone-error` | 红色波浪下划线 (`text-decoration: wavy underline red`) |
| `multi-tone` | `tone-multi` | 紫色虚线边框 |
| `unknown` | `tone-unknown` | 灰色斜体 |
| `punct` | `tone-punct` | 正常色，不检查 |

**关键**: 必须保证 HighlightLayer 和 TextareaLayer 的字体/字号/行高/字间距完全一致，否则会出现错位。

使用等宽中文字体栈：
```css
font-family: "Sarasa Mono SC", "Noto Sans Mono CJK SC", "Source Han Mono", "FangSong", monospace;
```

#### 4.2.4 `EditorTextarea.vue` —— 透明输入层

**职责**: 透明的 `<textarea>`，接收所有输入事件，转发给父组件。

```typescript
// Props
interface TextareaProps {
  modelValue: string
  disabled?: boolean
  placeholder?: string
}

// Emits
interface TextareaEmits {
  'update:modelValue': (value: string) => void
  'cursor-move': (line: number, col: number) => void
  'composition-start': () => void
  'composition-end': () => void
  'key-down': (e: KeyboardEvent) => void
}
```

**关键行为**:
```typescript
// IME 组合输入期间暂停分析
const isComposing = ref(false)

function onCompositionStart() {
  isComposing.value = true
  // 不触发分析，避免分析不完整的拼音
}

function onCompositionEnd(e: CompositionEvent) {
  isComposing.value = false
  // 组合完成，触发更新和分析
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}
```

#### 4.2.5 `EditorTooltip.vue` —— 悬浮提示

**职责**: 鼠标悬停在错误字符上时显示详细信息。

```typescript
interface TooltipProps {
  error: AnalysisError | null
  position: { x: number, y: number } | null
  multiToneCandidates?: { reading: string, tone: string, meaning: string }[]
}
```

#### 4.2.6 `EditorStatusBar.vue` —— 状态栏

**职责**: 显示当前统计：总字数/正确数/错误数/正确率/当前韵书。

---

## 5. 格律引擎与输入框绑定策略

### 5.1 总体策略: requestAnimationFrame + IME-aware

```
用户按键
  │
  ├── IME 组合中? ──Yes──→ 跳过分析，等 compositionend
  │
  └── No ──→ 更新 text ref
              │
              ├── 文本长度变化? ──No──→ 跳过(光标移动等)
              │
              └── Yes ──→ requestAnimationFrame
                            │
                            ▼
                      runAnalysis()
                            │
                            ├── analyzeText()       ~0.5ms (8000字)
                            ├── matchPattern()      ~0.1ms
                            ├── checkRhyme()        ~0.2ms
                            └── collectErrors()     ~0.1ms
                            │
                            ▼
                      总计 < 1ms → 即时渲染
```

### 5.2 为什么不用防抖(Debounce)

| 策略 | 延迟 | 体验 |
|---|---|---|
| 200ms debounce（现状）| 200ms | 打字后有可感知的停顿 |
| 50ms debounce | 50ms | 仍有轻微延迟 |
| **rAF throttle（推荐）** | 0-16ms | 感知为零延迟，每帧只跑一次 |

```typescript
// 新方案：使用 requestAnimationFrame 节流
import { ref, watch } from 'vue'

export function useAnalysis(text: Ref<string>, pattern: Ref<PatternTemplate>, rhymeBook: Ref<string>) {
  let rafId: number | null = null
  let lastText = ''
  const isComposing = ref(false)

  function scheduleAnalysis() {
    if (rafId !== null) return          // 已有待处理的帧
    if (isComposing.value) return       // IME 组合中，暂停
    
    rafId = requestAnimationFrame(() => {
      rafId = null
      if (text.value === lastText) return  // 文本未实际变化
      lastText = text.value
      runAnalysis(text.value, pattern.value, rhymeBook.value)
    })
  }

  // 监听文本变化
  watch([text, pattern, rhymeBook], scheduleAnalysis)

  // 对外暴露 isComposing 控制
  return {
    // ... 分析结果
    isComposing,
    scheduleAnalysis,
  }
}
```

### 5.3 IME 组合输入处理

中文输入法的关键事件：

```typescript
// 在 PoetryIDE.vue 中
function handleCompositionStart() {
  analysis.isComposing.value = true
  // 组合期间，高亮层不变（保持上次分析结果）
}

function handleCompositionEnd(e: CompositionEvent) {
  analysis.isComposing.value = false
  // 立即触发分析
  text.value = (e.target as HTMLTextAreaElement).value
}

function handleCompositionUpdate(e: CompositionEvent) {
  // 组合中，可以实时预览组合文字但不触发分析
  // 将组合文字显示在高亮层中（灰色/未分析状态）
}
```

### 5.4 光标位置追踪

```typescript
// 从 textarea 的 selectionStart 反算行列号
function getCursorPos(textarea: HTMLTextAreaElement, text: string): { line: number, col: number } {
  const pos = textarea.selectionStart
  const before = text.substring(0, pos)
  const lines = before.split('\n')
  return {
    line: lines.length - 1,
    col: lines[lines.length - 1].length
  }
}

// 监听: input / click / keyup(方向键)
```

### 5.5 性能保证

```
┌─ 数据层 ──────────────────────────────────────┐
│                                                │
│  tones.json: Map<字, 平仄>   ← O(1) 查一个字  │
│  rhymeMap:  Map<字, 韵部>    ← O(1) 查一个字  │
│  pattern.sentences[]  ← 模板就是数组，直接遍历  │
│                                                │
│  分析一个 56 字的七律:                          │
│    - 逐字查字典 × 56:   ~0.3ms                 │
│    - 逐字匹配模板 × 56:  ~0.1ms                 │
│    - 韵脚检查 × 4:       ~0.1ms                 │
│    - 总耗时:             < 1ms                  │
│                                                │
│  即使 200 字的长词牌(满江红等):                  │
│    - 总耗时:             < 2ms                  │
└────────────────────────────────────────────────┘

┌─ 渲染层 ──────────────────────────────────────┐
│                                                │
│  HighlightLayer:                               │
│    - 使用 Vue 的 <span v-for> 逐字渲染          │
│    - 每个 <span> 有静态 CSS 类，无复杂计算      │
│    - 可考虑使用 `v-memo` 减少不必要的重渲染      │
│    - 对于长文本(200+字)，可用虚拟滚动            │
│                                                │
│  同步滚动:                                     │
│    - textarea 的 scrollTop → highlightLayer     │
│    - 使用 passive scroll 监听器                 │
└────────────────────────────────────────────────┘
```

---

## 6. 实现路线图

### Phase 1: 核心引擎不动，优化分析管线

| 步骤 | 内容 | 影响文件 |
|---|---|---|
| 1.1 | 将 200ms debounce 改为 rAF throttle | `composables/useAnalysis.js` |
| 1.2 | 添加 IME composition 事件支持 | `composables/useAnalysis.js` |
| 1.3 | 构建韵书反向索引 Map (启动时) | `core/rhymeChecker.js` |
| 1.4 | 添加光标位置追踪 | 新增 `composables/useCursor.js` |

### Phase 2: 重构编辑器视图

| 步骤 | 内容 | 影响文件 |
|---|---|---|
| 2.1 | 新建 `PoetryIDE.vue` 容器 | 新增 |
| 2.2 | 新建 `EditorGutter.vue` | 新增 |
| 2.3 | 新建 `EditorHighlightLayer.vue` | 新增 |
| 2.4 | 新建 `EditorTextarea.vue` (透明覆盖) | 新增 |
| 2.5 | 新建 `EditorTooltip.vue` | 新增 |
| 2.6 | 新建 `EditorStatusBar.vue` | 新增 |
| 2.7 | 修改 `App.vue` 使用新组件 | 修改 |

### Phase 3: 样式精调

| 步骤 | 内容 |
|---|---|
| 3.1 | 统一 HighlightLayer 和 Textarea 的字体的精确对齐 |
| 3.2 | 红色波浪下划线 (tone-error) |
| 3.3 | 金色韵脚标记 |
| 3.4 | 紫色多音字虚线 |
| 3.5 | 暗色模式支持 |

### Phase 4: 交互增强

| 步骤 | 内容 |
|---|---|
| 4.1 | 鼠标悬浮错误字符 → tooltip |
| 4.2 | 点击错误 → 跳转到 ErrorPanel 对应条目 |
| 4.3 | Ctrl+Click 多音字 → 切换读音/平仄 |
| 4.4 | 键盘快捷键 (Ctrl+Enter 切换韵书等) |

---

## 7. 风险与注意事项

| 风险 | 级别 | 缓解措施 |
|---|---|---|
| IME 组合输入兼容性 | 🔴 高 | 严格处理 compositionstart/update/end 三个事件；在主流浏览器+输入法组合下测试 |
| Highlight 层与 textarea 字体偏移 | 🟡 中 | 使用等宽字体 + 精确相同的 CSS 盒模型属性(font/line-height/letter-spacing/padding/border) |
| 长词牌(~200字)渲染性能 | 🟢 低 | Vue `v-memo` + 仅在分析结果变化时重新渲染 span |
| 移动端触摸交互 | 🟡 中 | 移动端 textarea 行为与桌面端不同，需单独测试 |
| 旧版 PoetryEditor 兼容 | 🟢 低 | 保留旧组件，通过 feature flag 或 props 切换新旧编辑器 |

---

## 8. 关键文件清单

```
tool/src/
├── App.vue                          [修改] 接入 PoetryIDE
├── composables/
│   ├── useAnalysis.js               [修改] rAF throttle + IME 支持
│   ├── useCursor.js                 [新增] 光标位置追踪
│   ├── usePattern.js                [不变]
│   └── useCipai.js                  [不变]
├── components/
│   ├── PoetryIDE.vue                [新增] 统一编辑器容器
│   ├── EditorGutter.vue             [新增] 行号/错误标记
│   ├── EditorHighlightLayer.vue     [新增] 着色显示层
│   ├── EditorTextarea.vue           [新增] 透明输入层
│   ├── EditorTooltip.vue            [新增] 悬浮提示
│   ├── EditorStatusBar.vue          [新增] 底部状态栏
│   ├── PatternSelector.vue          [保留，可能微调]
│   ├── PoetryEditor.vue             [保留，旧版兼容]
│   ├── CharToken.vue                [保留，旧版兼容]
│   ├── RhymeHint.vue                [微调]
│   └── ErrorPanel.vue               [微调]
├── core/
│   ├── toneAnalyzer.js              [不变]
│   ├── rhymeChecker.js              [优化] 启动时预建反向索引
│   ├── patternMatcher.js            [不变]
│   └── charClassifier.js            [不变]
└── data/                            [不变]
    ├── tones.json
    ├── custom.json
    ├── rhymes/
    └── patterns/
```
