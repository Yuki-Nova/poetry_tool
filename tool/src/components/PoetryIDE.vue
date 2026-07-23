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
      :multi-tone-candidates="hoveredCandidates"
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
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'char-click', 'cursor-move'])

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
      hoveredCandidates.value = found?.candidates || null
    } else {
      hoveredCandidates.value = null
    }
  } else {
    hoveredError.value = null
    hoveredCandidates.value = null
  }
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
</style>
