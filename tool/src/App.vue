<template>
  <div id="app">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">诗词填写</h1>
        <span class="app-subtitle">平仄分析 / 押韵校验 / 格律高亮</span>
      </div>
      <div class="header-right">
        <span class="rhyme-label">韵书</span>
        <button
          v-for="(label, key) in RHYME_BOOK_LABELS"
          :key="key"
          class="rhyme-btn"
          :class="{ active: effectiveRhymeBook === key }"
          @click="rhymeBook = key"
        >{{ label }}</button>
      </div>
    </header>

    <div class="app-selector">
      <PatternSelector
        :grouped="groupedPatterns"
        :current="currentPattern"
        :selected-id="selectedId"
        @select="selectPattern"
      />
      <div v-if="draftRestored" class="draft-bar">
        <span class="draft-bar-text">已恢复上次草稿</span>
        <button class="draft-bar-clear" @click="clearDraft">清空</button>
      </div>
    </div>

    <div class="app-main">
      <div class="app-main-left">
        <PatternPreview
          :pattern="activePattern"
          :formats="currentPattern?.formats || []"
          :format-index="formatIndex"
          @change-format="formatIndex = $event"
          @jump="onPreviewJump"
        />

        <PoetryIDE
          ref="ideRef"
          v-model="inputText"
          :pattern="currentPattern"
          :match-results="matchResults"
          :stats="stats"
          :errors="errors"
          :multi-tone-list="multiToneList"
          :rhyme-book="effectiveRhymeBook"
          :rhyme-result="rhymeResult"
          :analyzing="analyzing"
          @char-click="onCharClick"
          @candidate-select="onCandidateSelect"
        />

        <div class="app-bottom">
          <RhymeHint
            :rhyme-result="rhymeResult"
            :rhyme-book="effectiveRhymeBook"
          />
          <ErrorPanel
            :errors="errors"
            :show-empty="inputText.length > 0"
            @jump="onJumpToError"
          />
        </div>
      </div>

      <CipaiInfoPanel
        class="app-main-right"
        :pattern="activePattern"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import PatternSelector from './components/PatternSelector.vue'
import PatternPreview from './components/PatternPreview.vue'
import PoetryIDE from './components/PoetryIDE.vue'
import RhymeHint from './components/RhymeHint.vue'
import ErrorPanel from './components/ErrorPanel.vue'
import CipaiInfoPanel from './components/CipaiInfoPanel.vue'

import { useCipai } from './composables/useCipai'
import { usePattern } from './composables/usePattern'
import { useAnalysis } from './composables/useAnalysis'
import { useDraft } from './composables/useDraft'
import { RHYME_BOOK_LABELS } from './core/rhymeChecker'

const { list: cipaiList } = useCipai()
const { selectedId, currentPattern, groupedPatterns, allPatterns, selectPattern } = usePattern(cipaiList)
const inputText = ref('')
const rhymeBook = ref(null)

// ── 多格式变体：当前选中格式序号（0 = 主格式）──
const formatIndex = ref(0)
// 分析使用的格律：formats 存在且长度>1 时，取当前变体的 sentences
const activePattern = computed(() => {
  const p = currentPattern.value
  if (p?.formats && p.formats.length > 1 && p.formats[formatIndex.value]) {
    return {
      ...p,
      sentences: p.formats[formatIndex.value].sentences,
      sourceFormat: p.formats[formatIndex.value].label,
      charCount: p.formats[formatIndex.value].sentences.reduce((s, x) => s + x.length, 0)
    }
  }
  return p
})

// 切换词牌时重置变体序号
watch(selectedId, () => { formatIndex.value = 0 })

const { matchResults, stats, rhymeResult, errors, multiToneList, effectiveRhymeBook, analyzing, setToneOverride } = useAnalysis(inputText, activePattern, rhymeBook)

// ── 草稿自动保存 ──
const draft = useDraft({ text: inputText, patternId: selectedId, rhymeBook })
const draftRestored = ref(false)

function tryRestoreDraft() {
  if (draftRestored.value) return
  const d = draft.load()
  if (!d) return
  // 校验格律模板是否存在（词牌列表异步加载，等待其就绪）
  if (d.patternId && !allPatterns.value.some(p => p.id === d.patternId)) return
  inputText.value = d.text
  if (d.patternId) selectPattern(d.patternId)
  if (d.rhymeBook) rhymeBook.value = d.rhymeBook
  draftRestored.value = true
}

// 首次渲染后尝试恢复；词牌列表加载完成后重试（草稿模板可能是词牌）
onMounted(() => {
  tryRestoreDraft()
  watch(cipaiList, tryRestoreDraft, { once: true })
})

function clearDraft() {
  draft.clear()
  inputText.value = ''
  draftRestored.value = false
}

const ideRef = ref(null)
function onCharClick(item) {
  if (item.status === 'multi-tone') console.log('[多音字]', item.char, item)
}

function onCandidateSelect({ line, col, char, candidate }) {
  setToneOverride(line, col, char, candidate.tone)
}

function onJumpToError(line, col) {
  if (ideRef.value?.jumpTo) ideRef.value.jumpTo(line, col)
}

/**
 * 格律预览点击跳转：目标行未创建时自动补空行（如已输入第 1 行，点击第 8 行 → 自动创建 1~8 行）
 */
function onPreviewJump(line, col) {
  const text = inputText.value
  const currentLineCount = text === '' ? 1 : text.split('\n').length
  const targetLine = line + 1
  if (targetLine > currentLineCount) {
    inputText.value = text + '\n'.repeat(targetLine - currentLineCount)
  }
  // 等 textarea 完成更新后再定位光标，确保目标行已存在
  nextTick(() => {
    if (ideRef.value?.jumpTo) ideRef.value.jumpTo(line, col)
  })
}
</script>

<style>
/* ====== 「山影」配色体系 ====== */
:root {
  --ink: #1a1c1d;
  --ink-light: #5c6063;
  --ink-muted: #94989b;
  --paper: #f5f4f0;
  --paper-card: #ffffff;
  --paper-warm: #eef0ec;
  --border: #e4e3de;
  --border-light: #eeede8;
  --accent: #3d5a80;
  --accent-soft: rgba(61, 90, 128, 0.08);

  /* 平仄色 */
  --ping-bg: #edf1f5;
  --ping-text: #3d5a80;
  --ze-text: #5c5c5c;
  --rhyme-border: #b8954a;
  --error-bg: #fdf0ee;
  --error-text: #c04a3a;
  --error-underline: #c04a3a;
  --multi-bg: #f3eef8;
  --multi-text: #7c6b8e;
  --multi-border: #bfafd0;

  --success: #5b8c7e;
  --warning: #b8954a;
  --danger: #c04a3a;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
#app {
  max-width: 1180px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

/* ── 词牌选择横条（全宽，独立于双栏） ── */
.app-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--paper-card);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.app-selector .pattern-selector { margin: 0; }
.app-selector .draft-bar { margin: 0; flex: 1 1 100%; }

/* ── 双栏布局：左侧主编辑器 + 右侧词牌信息面板 ── */
.app-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 20px;
  align-items: start;
}
.app-main-left { min-width: 0; }
.app-main-right {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.app-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.app-title {
  font-size: 24px;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
  letter-spacing: 0.06em;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
}

.app-subtitle {
  font-size: 13px;
  color: var(--ink-muted);
  letter-spacing: 0.03em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rhyme-label {
  font-size: 12px;
  color: var(--ink-muted);
  margin-right: 4px;
}

.rhyme-btn {
  font-size: 12px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: transparent;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
}
.rhyme-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.rhyme-btn.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.app-bottom {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* ── 草稿恢复提示条 ── */
.draft-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 10px 0 4px;
  padding: 8px 14px;
  background: var(--accent-soft);
  border: 1px solid rgba(61, 90, 128, 0.25);
  border-radius: 6px;
  font-size: 12px;
  color: var(--accent);
  animation: draft-in 0.25s ease;
}
.draft-bar-text {
  display: flex;
  align-items: center;
  gap: 8px;
}
.draft-bar-text::before {
  content: '↻';
  font-size: 14px;
}
.draft-bar-clear {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2px 12px;
  font-size: 11px;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
}
.draft-bar-clear:hover {
  border-color: var(--danger);
  color: var(--danger);
}
@keyframes draft-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .app-main { grid-template-columns: 1fr; }
  .app-main-right { position: static; max-height: none; overflow: visible; }
}

@media (max-width: 640px) {
  #app { padding: 20px 14px 60px; }
  .app-title { font-size: 20px; }
  .app-bottom { grid-template-columns: 1fr; }
  .app-header { align-items: flex-start; }
  .header-right { width: 100%; flex-wrap: wrap; }
  .rhyme-btn { flex: 1 1 auto; text-align: center; padding: 6px 8px; }
  .rhyme-label { display: none; }
}
</style>
