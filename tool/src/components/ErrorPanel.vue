<template>
  <div v-if="errors.length" class="error-panel">
    <div class="ep-header" @click="collapsed = !collapsed">
      <span class="ep-title">{{ errors.length }} 个问题</span>
      <span class="ep-toggle">{{ collapsed ? '展开 ▸' : '收起 ▾' }}</span>
    </div>
    <div v-if="!collapsed" class="ep-list">
      <div
        v-for="(err, i) in errors"
        :key="i"
        class="ep-item"
        :class="'ep-' + err.type"
        @click="$emit('jump', err.line, err.col)"
      >
        <span class="ep-loc">第{{ err.line + 1 }}句{{ err.col >= 0 ? '第' + (err.col + 1) + '字' : '' }}</span>
        <span v-if="err.col >= 0" class="ep-char">「{{ err.char }}」</span>
        <span class="ep-msg">{{ err.message }}</span>
      </div>
    </div>
  </div>

  <div v-else-if="showEmpty" class="error-panel ep-empty">
    <span class="ep-check">&#10003;</span> 格律全部正确
  </div>
</template>

<script setup>
import { ref } from 'vue'
defineProps({
  errors: { type: Array, default: () => [] },
  showEmpty: { type: Boolean, default: false }
})
defineEmits(['jump'])
const collapsed = ref(false)
</script>

<style scoped>
.error-panel {
  background: var(--paper-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  overflow: hidden;
}

.ep-empty {
  padding: 14px 16px;
  text-align: center;
  color: var(--success);
  font-size: 14px;
}

.ep-check {
  font-size: 16px;
  font-weight: 700;
}

.ep-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.ep-header:hover { background: var(--paper-warm); }

.ep-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--danger);
}

.ep-toggle {
  font-size: 11px;
  color: var(--ink-muted);
}

.ep-list {
  max-height: 260px;
  overflow-y: auto;
  border-top: 1px solid var(--border-light);
}

.ep-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 16px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.08s;
  border-left: 2px solid transparent;
}
.ep-item:hover { background: var(--paper-warm); }

.ep-tone  { border-left-color: var(--danger); }
.ep-rhyme { border-left-color: var(--warning); }
.ep-multi { border-left-color: var(--multi-text); }
.ep-unknown { border-left-color: var(--ink-muted); }

.ep-loc {
  color: var(--ink-muted);
  font-size: 11px;
  white-space: nowrap;
  min-width: 64px;
}

.ep-char {
  color: var(--ink);
  font-weight: 600;
  white-space: nowrap;
}

.ep-msg {
  color: var(--ink-light);
  flex: 1;
}
</style>
