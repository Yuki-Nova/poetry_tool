<template>
  <textarea
    ref="taRef"
    class="editor-textarea"
    :value="modelValue"
    :placeholder="placeholder"
    :disabled="disabled"
    :spellcheck="false"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    rows="8"
    @input="onInput"
    @click="syncCursor"
    @keyup="syncCursor"
    @compositionstart="isComposing = true"
    @compositionupdate="onCompUpdate"
    @compositionend="onCompEnd"
  ></textarea>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'cursor-move'])
const taRef = ref(null)
const isComposing = ref(false)

function getCursorPos() {
  const ta = taRef.value
  if (!ta) return { line: 0, col: 0 }
  const pos = ta.selectionStart
  const before = props.modelValue.substring(0, pos)
  const lines = before.split('\n')
  return { line: Math.max(0, lines.length - 1), col: lines[lines.length - 1].length }
}

function syncCursor() { emit('cursor-move', getCursorPos()) }

function onInput(e) {
  if (isComposing.value) return
  emit('update:modelValue', e.target.value)
  requestAnimationFrame(syncCursor)
}

function onCompUpdate() {}
function onCompEnd(e) {
  isComposing.value = false
  emit('update:modelValue', e.target.value)
  requestAnimationFrame(syncCursor)
}

function jumpTo(line, col) {
  const ta = taRef.value
  if (!ta) return
  const raw = props.modelValue || ''
  const lines = raw.split('\n')
  let offset = 0
  for (let i = 0; i < Math.min(line, lines.length); i++) offset += lines[i].length + 1
  offset = Math.min(offset + col, raw.length)
  ta.focus()
  ta.setSelectionRange(offset, offset)
  emit('cursor-move', { line, col })
}

defineExpose({ jumpTo })
</script>

<style scoped>
.editor-textarea {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 20px;
  line-height: 2.2;
  color: transparent;
  caret-color: var(--accent);
  background: transparent;
  border: none;
  outline: none;
  resize: none;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: auto;
  z-index: 2;
}

.editor-textarea::placeholder {
  color: #c4b8a8;
}
</style>
