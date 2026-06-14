<template>
  <div id="poetry-tool">
    <header class="app-header">
      <h1>📜 诗词填写工具</h1>
      <span class="app-subtitle">平仄分析 · 押韵校验 · 格律高亮</span>
    </header>

    <!-- 格律选择 -->
    <PatternSelector
      :grouped="groupedPatterns"
      :current="currentPattern"
      :selected-id="selectedId"
      @select="selectPattern"
    />

    <!-- 主编辑区 -->
    <div class="app-main">
      <PoetryEditor
        :text="inputText"
        :pattern="currentPattern"
        :match-results="matchResults"
        :stats="stats"
        @update:text="inputText = $event"
        @char-click="onCharClick"
      />

      <!-- 侧面面板 -->
      <div class="app-sidebar">
        <RhymeHint :rhyme-result="rhymeResult" :rhyme-book="effectiveRhymeBook" @update:rhyme-book="rhymeBook = $event" />
        <ErrorPanel
          :errors="errors"
          :show-empty="inputText.length > 0"
          @jump="onJumpToError"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import PatternSelector from './components/PatternSelector.vue'
import PoetryEditor from './components/PoetryEditor.vue'
import RhymeHint from './components/RhymeHint.vue'
import ErrorPanel from './components/ErrorPanel.vue'

import { useCipai } from './composables/useCipai'
import { usePattern } from './composables/usePattern'
import { useAnalysis } from './composables/useAnalysis'

// 词牌列表
const { list: cipaiList } = useCipai()

// 格律模板
const {
  selectedId,
  currentPattern,
  groupedPatterns,
  selectPattern
} = usePattern(cipaiList)

// 用户输入
const inputText = ref('')

// 韵书手动选择（null = 自动推导：诗→新韵 词→词林）
const rhymeBook = ref(null)

// 分析
const {
  matchResults,
  stats,
  rhymeResult,
  errors,
  effectiveRhymeBook
} = useAnalysis(inputText, currentPattern, rhymeBook)

function onCharClick(item) {
  // 多音字点击：暂打印到 console
  if (item.status === 'multi-tone') {
    console.log('[多音字]', item.char, item)
  }
}

function onJumpToError(line, col) {
  // 聚焦到对应输入位置（简单实现：滚动到 textarea）
  console.log('[跳转]', `第${line + 1}句 第${col + 1}字`)
}
</script>

<style scoped>
#poetry-tool {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 20px 60px;
  font-family: var(--font, 'Noto Serif SC', 'SimSun', serif);
}

.app-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border, #d4c5a9);
}

.app-header h1 {
  font-size: 28px;
  color: var(--accent, #8b4513);
  margin: 0 0 6px;
}

.app-subtitle {
  font-size: 14px;
  color: var(--text-muted, #8b7355);
}

.app-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 20px;
}

.app-sidebar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 600px) {
  .app-sidebar {
    grid-template-columns: 1fr;
  }
}
</style>
