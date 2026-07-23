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

    <PatternSelector
      :grouped="groupedPatterns"
      :current="currentPattern"
      :selected-id="selectedId"
      @select="selectPattern"
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
      :analyzing="analyzing"
      @char-click="onCharClick"
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
</template>

<script setup>
import { ref } from 'vue'
import PatternSelector from './components/PatternSelector.vue'
import PoetryIDE from './components/PoetryIDE.vue'
import RhymeHint from './components/RhymeHint.vue'
import ErrorPanel from './components/ErrorPanel.vue'

import { useCipai } from './composables/useCipai'
import { usePattern } from './composables/usePattern'
import { useAnalysis } from './composables/useAnalysis'
import { RHYME_BOOK_LABELS } from './core/rhymeChecker'

const { list: cipaiList } = useCipai()
const { selectedId, currentPattern, groupedPatterns, selectPattern } = usePattern(cipaiList)
const inputText = ref('')
const rhymeBook = ref(null)

const { matchResults, stats, rhymeResult, errors, multiToneList, effectiveRhymeBook, analyzing } = useAnalysis(inputText, currentPattern, rhymeBook)

const ideRef = ref(null)

function onCharClick(item) {
  if (item.status === 'multi-tone') console.log('[多音字]', item.char, item)
}

function onJumpToError(line, col) {
  if (ideRef.value?.jumpTo) ideRef.value.jumpTo(line, col)
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
  max-width: 940px;
  margin: 0 auto;
  padding: 32px 24px 80px;
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

@media (max-width: 640px) {
  #app { padding: 20px 14px 60px; }
  .app-title { font-size: 20px; }
  .app-bottom { grid-template-columns: 1fr; }
}
</style>
