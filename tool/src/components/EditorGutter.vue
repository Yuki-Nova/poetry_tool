<template>
  <div class="editor-gutter">
    <div
      v-for="(_, li) in lines"
      :key="li"
      class="gutter-line"
      :class="{
        'gutter-active': li === activeLine,
        'gutter-error': lineError(li)
      }"
    >
      <span class="gutter-num">{{ li + 1 }}</span>
      <span v-if="lineError(li)" class="err-dot"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [''] },
  errors: { type: Array, default: () => [] },
  activeLine: { type: Number, default: 0 },
  pattern: { type: Object, default: null }
})

const errorByLine = computed(() => {
  const map = {}
  props.errors.forEach(err => {
    if (err.type === 'tone') map[err.line] = true
    else if (!(err.line in map)) map[err.line] = false
  })
  return map
})

function lineError(li) { return errorByLine.value[li] || false }
</script>

<style scoped>
.editor-gutter {
  width: 44px;
  min-width: 44px;
  background: var(--paper-warm);
  border-right: 1px solid var(--border-light);
  padding: 10px 0;
  user-select: none;
  overflow: hidden;
}

.gutter-line {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  position: relative;
  transition: background 0.12s;
  cursor: pointer;
}

.gutter-num {
  font-size: 11px;
  color: var(--ink-muted);
  font-family: 'SF Mono', 'Consolas', 'Courier New', monospace;
  pointer-events: none;
  transition: color 0.15s;
}

/* 当前行 */
.gutter-active {
  background: var(--accent-soft);
}
.gutter-active .gutter-num {
  color: var(--accent);
  font-weight: 700;
}

/* 错误标记(右侧) */
.gutter-error {
  background: rgba(192, 74, 58, 0.05);
}

.err-dot {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--danger);
}
</style>
