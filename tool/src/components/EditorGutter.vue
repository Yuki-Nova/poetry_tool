<template>
  <div class="editor-gutter">
    <div
      v-for="(_, li) in lines"
      :key="li"
      class="gutter-line"
      :class="{
        'gutter-active': li === activeLine,
        'gutter-error': lineError(li),
        'has-breakpoint': breakpoints.has(li)
      }"
      @click="toggleBreakpoint(li)"
    >
      <span class="bp-dot" v-if="breakpoints.has(li)"></span>
      <span class="gutter-num">{{ li + 1 }}</span>
      <span v-if="lineError(li)" class="err-dot"></span>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [''] },
  errors: { type: Array, default: () => [] },
  activeLine: { type: Number, default: 0 },
  pattern: { type: Object, default: null }
})

const emit = defineEmits(['line-click'])

const breakpoints = reactive(new Set())

const errorByLine = computed(() => {
  const map = {}
  props.errors.forEach(err => {
    if (err.type === 'tone' || err.severity === 'error') map[err.line] = true
    else if (!(err.line in map)) map[err.line] = false
  })
  return map
})

function lineError(li) { return errorByLine.value[li] || false }

function toggleBreakpoint(li) {
  if (breakpoints.has(li)) {
    breakpoints.delete(li)
  } else {
    breakpoints.add(li)
  }
}
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

/* 断点标记(左侧) */
.bp-dot {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 0 2px rgba(192, 74, 58, 0.25);
}

/* 有断点时行号隐藏 */
.has-breakpoint .gutter-num {
  color: transparent;
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
