<template>
  <div class="poetry-ide" :class="{ 'ide-disabled': disabled }">
    <EditorStatusBar
      :pattern="pattern"
      :stats="stats"
      :rhyme-book="rhymeBook"
      :analyzing="analyzing"
    />

    <div class="ide-editor-area">
      <EditorGutter
        :lines="displayLines"
        :errors="errors"
        :active-line="activeLine"
        :pattern="pattern"
      />

      <div class="ide-code-area" ref="codeAreaRef">
        <EditorHighlightLayer
          :lines="displayLines"
          :match-results="matchResults"
          :rhyme-errors="rhymeErrorList"
          :active-line="activeLine"
          :active-col="activeCol"
          @char-hover="onCharHover"
        />

        <EditorTextarea
          ref="textareaRef"
          :model-value="modelValue"
          :placeholder="placeholderText"
          :disabled="disabled"
          @update:model-value="onInput"
          @cursor-move="onCursorMove"
        />
      </div>
    </div>

    <EditorTooltip
      :error="hoveredError"
      :position="tooltipPos"
      :multi-tone-candidates="hoveredCandidates?.candidates || null"
      :suggested-tone="hoveredCandidates?.suggested?.tone || null"
      @select="onCandidateSelect"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import EditorGutter from './EditorGutter.vue'
import EditorHighlightLayer from './EditorHighlightLayer.vue'
import EditorTextarea from './EditorTextarea.vue'
import EditorTooltip from './EditorTooltip.vue'
import EditorStatusBar from './EditorStatusBar.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  pattern: { type: Object, default: null },
  matchResults: { type: Array, default: () => [] },
  stats: { type: Object, default: null },
  errors: { type: Array, default: () => [] },
  multiToneList: { type: Array, default: () => [] },
  rhymeBook: { type: String, default: 'xinyun' },
  analyzing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  // 押韵校验结果（含出韵/未收录错误列表）
  rhymeResult: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'char-click', 'cursor-move', 'candidate-select'])

const textareaRef = ref(null)
const codeAreaRef = ref(null)
const activeLine = ref(0)
const activeCol = ref(0)
const hoveredError = ref(null)
const tooltipPos = ref({ x: 0, y: 0 })
const hoveredCandidates = ref(null)

const displayLines = computed(() => {
  const text = props.modelValue || ''
  return text === '' ? [''] : text.split('\n')
})

// 押韵错误 → 高亮层可定位的 {line, col, char}
// checkRhyme.errors 携带 line + char；列号由 matchResults 中该行「韵脚字」位置确定
// （最后一个有效字符；跳过行尾标点，与 extractRhymeChars 逻辑一致）
const rhymeErrorList = computed(() => {
  const errs = props.rhymeResult?.errors || []
  if (!errs.length) return []
  return errs.map(e => {
    const lineRes = props.matchResults?.[e.line] || []
    let col = -1
    for (let j = lineRes.length - 1; j >= 0; j--) {
      const item = lineRes[j]
      if (item && item.tone !== 'skip' && item.tone !== 'punct') {
        // 仅当该位置确实是韵脚（isRhyme）或与错误字一致时定位
        if (item.isRhyme || item.char === e.char) { col = j }
        break
      }
    }
    return { line: e.line, col, char: e.char }
  })
})

const placeholderText = computed(() => {
  if (!props.pattern) return '请先选择格律模板...'
  return `请输入${props.pattern.name || '诗词'}内容，每句一行...`
})

function onInput(val) { emit('update:modelValue', val) }

function onCursorMove(pos) {
  activeLine.value = pos.line
  activeCol.value = pos.col
}

function onCharHover(payload) {
  if (payload.error) {
    hoveredError.value = payload.error
    tooltipPos.value = { x: payload.x, y: payload.y }
    if (payload.char && props.multiToneList) {
      const found = props.multiToneList.find(m => m.line === payload.line && m.col === payload.col)
      hoveredCandidates.value = found || null
    } else {
      hoveredCandidates.value = null
    }
  } else {
    hoveredError.value = null
    hoveredCandidates.value = null
  }
}

function onCandidateSelect(payload) {
  hoveredError.value = null
  hoveredCandidates.value = null
  emit('candidate-select', payload)
}

function jumpTo(line, col) {
  if (textareaRef.value) textareaRef.value.jumpTo(line, col)
}

defineExpose({ jumpTo })
</script>

<style scoped>
.poetry-ide {
  background: var(--paper-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ide-disabled {
  opacity: 0.6;
  pointer-events: none;
}

.ide-editor-area {
  display: flex;
  position: relative;
  min-height: 220px;
  font-family: 'Noto Serif SC', 'SimSun', 'FangSong', serif;
  font-size: 20px;
  line-height: 2.2;
}

.ide-code-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* ── 移动端适配：编辑器整体缩小，保持高亮层/输入层/行号三者对齐 ── */
@media (max-width: 640px) {
  .ide-editor-area {
    font-size: 16px;
    line-height: 1.875; /* 16 × 1.875 = 30px 行高，与 Gutter/Highlight/Textarea 同步 */
    min-height: 160px;
  }
}
</style>
