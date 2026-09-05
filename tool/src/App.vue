<template>
  <div id="app">
    <header class="app-header">
      <div class="header-left">
        <h1 class="app-title">诗词填写</h1>
        <span class="app-subtitle">平仄分析 / 押韵校验 / 格律高亮</span>
      </div>
      <div class="header-right">
              <button v-if="!panelOpen" class="rhyme-btn panel-restore" @click="panelOpen = true">
                词牌信息
              </button>
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

      <aside class="app-main-right" v-show="panelOpen">
              <div class="panel-toolbar" @click="panelOpen = false" title="收起面板">
                <span>词牌信息</span>
                <button class="panel-toolbar-btn" type="button">收起</button>
              </div>
              <CipaiInfoPanel :pattern="activePattern" />
            </aside>
          </div>

          <footer class="app-footer">
            <a href="https://yukinova.top/">yuki's stop</a> · 诗词填写工具
          </footer>
        </div>
        <button
          v-if="showTop"
          class="back-top"
          @click="scrollTop"
          title="回到顶部"
        >↑</button>
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

// ── 排布:右侧面板折叠 + 回顶按钮(2026-09-05,A4 纸张布局)──
const panelOpen = ref(true)
const showTop = ref(false)
function onScroll() { showTop.value = (window.scrollY || document.documentElement.scrollTop) > 300 }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

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
  window.addEventListener('scroll', onScroll, { passive: true })
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
/* ====== 「纸墨」配色体系 v2(2026-09-05,与博客 shiro/相册同源) ======
   品牌族:paper/ink/seal 印章红(+暗色 data-theme,localStorage shiro-theme 联动)
   语义色独立:平仄=墨阶,韵脚=朱批淡红,多音=淡紫,出韵/错误=红(不随品牌) */
:root {
  --ink: #2b3036;
  --ink-light: #5f6877;
  --ink-muted: #6b7280;
  --paper: #ffffff;
  --paper-card: #ffffff;
  --paper-warm: #f6f6f3;
  --border: rgba(17, 24, 39, 0.10);
  --border-light: rgba(17, 24, 39, 0.06);
  --accent: #b0171a;
    --accent-soft: rgba(176, 23, 26, 0.08);
    --desk: #e9e8e4;
    --paper-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 18px 50px rgba(0, 0, 0, 0.10);
    --font-poetry: 'Cardo', 'Noto Serif SC', 'Source Han Serif SC', 'Zen Old Mincho',
      'Shippori Mincho', 'SimSun', serif;

  /* 平仄语义色(墨阶) */
  --ping-bg: rgba(43, 48, 54, 0.06);
  --ping-text: #2b3036;
  --ze-text: #6b7280;
  /* 韵脚:朱批意象(印红淡底) */
  --rhyme-bg: rgba(176, 23, 26, 0.08);
  --rhyme-border: #b0171a;
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

:root[data-theme="dark"] {
  color-scheme: dark;
  --ink: #e4e1d9;
  --ink-light: #c2c6ce;
  --ink-muted: #a8acb5;
  --paper: #17191d;
  --paper-card: #1d2026;
  --paper-warm: #16181d;
  --border: rgba(228, 225, 217, 0.14);
  --border-light: rgba(228, 225, 217, 0.09);
  --accent: #e05256;
    --accent-soft: rgba(224, 82, 86, 0.14);
    --desk: #101215;
    --paper-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), 0 18px 50px rgba(0, 0, 0, 0.35);

  --ping-bg: rgba(228, 225, 217, 0.10);
  --ping-text: #e4e1d9;
  --ze-text: #a8acb5;
  --rhyme-bg: rgba(224, 82, 86, 0.16);
  --rhyme-border: #e05256;
  --error-bg: rgba(192, 74, 58, 0.14);
  --error-text: #ef8f80;
  --error-underline: #ef8f80;
  --multi-bg: rgba(167, 139, 250, 0.14);
  --multi-text: #b5a5e0;
  --multi-border: #8f7fc0;

  --success: #6fae9d;
  --warning: #d3a75e;
  --danger: #ef8f80;
}

body {
  margin: 0;
  background: var(--desk);
  color: var(--ink);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>

<style scoped>
#app {
  max-width: 1000px;
  margin: 28px auto 40px;
  padding: 36px 42px 64px;
  background: var(--paper-card);
  border-radius: 3px;
  box-shadow: var(--paper-shadow), inset 0 0 0 1px var(--border-light);
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
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
}
.app-main-left { min-width: 0; }
.app-main-left.is-wide { grid-column: 1 / -1; }
.app-main-right {
  position: sticky;
  top: 16px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
}
.panel-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  margin-bottom: 8px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.panel-toolbar-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}
.panel-restore { border-color: var(--accent); color: var(--accent); }

.app-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
}

.app-title {
  font-size: 17px;
  font-weight: 500;
  color: var(--ink);
  margin: 0;
  letter-spacing: 0.06em;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
}

.app-subtitle {
  font-size: 11px;
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
  border: 1px solid rgba(176, 23, 26, 0.25);
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

/* ── 底部 footer(与博客呼应)── */
.app-footer {
  margin-top: 26px;
  padding-top: 13px;
  border-top: 1px solid var(--border-light);
  font-size: 12px;
  color: var(--ink-muted);
  text-align: center;
}
.app-footer a {
  color: var(--accent);
  text-decoration: none;
}

/* ── 回顶部按钮 ── */
.back-top {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 50;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--paper-card);
  color: var(--accent);
  box-shadow: var(--paper-shadow);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: all 0.15s;
}
.back-top:hover { border-color: var(--accent); }

@media (max-width: 900px) {
  .app-main { grid-template-columns: 1fr; }
  .app-main-right { position: static; max-height: none; overflow: visible; }
}

@media (max-width: 640px) {
  #app {
    margin: 0;
    padding: 20px 14px 52px;
    border-radius: 0;
    box-shadow: none;
    max-width: none;
  }
  .app-title { font-size: 17px; }
  .app-bottom { grid-template-columns: 1fr; }
  .app-header { align-items: flex-start; }
  .header-right { width: 100%; flex-wrap: wrap; }
  .rhyme-btn { flex: 1 1 auto; text-align: center; padding: 6px 8px; }
  .rhyme-label { display: none; }
  .back-top { right: 14px; bottom: 14px; }
}
</style>
