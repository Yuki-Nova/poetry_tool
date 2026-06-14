<template>
  <div v-if="errors.length > 0" class="error-panel">
    <div class="ep-header">
      <span class="ep-title">⚠ 问题列表（{{ errors.length }}）</span>
      <button class="ep-toggle" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
      </button>
    </div>

    <div v-if="!collapsed" class="ep-list">
      <div
        v-for="(err, i) in errors"
        :key="i"
        class="ep-item"
        :class="'ep-' + err.type"
        @click="$emit('jump', err.line, err.col)"
      >
        <span class="ep-loc">
          {{ err.col >= 0 ? `第${err.line + 1}句第${err.col + 1}字` : `第${err.line + 1}句` }}
        </span>
        <span class="ep-char" v-if="err.col >= 0">「{{ err.char }}」</span>
        <span class="ep-msg">{{ err.message }}</span>
      </div>
    </div>
  </div>

  <div v-else-if="showEmpty" class="error-panel error-empty">
    ✅ 格律全部正确
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  errors: { type: Array, default: () => [] },
  showEmpty: { type: Boolean, default: false }
})

defineEmits(['jump'])

const collapsed = ref(false)
</script>

<style scoped>
.error-panel {
  background: var(--bg-card, #fffef9);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(62, 44, 28, 0.06);
  overflow: hidden;
}

.error-empty {
  padding: 14px 16px;
  text-align: center;
  color: #27ae60;
  font-size: 14px;
}

.ep-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fef0f0;
  border-bottom: 1px solid #f5c6cb;
}

.ep-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--danger, #c0392b);
}

.ep-toggle {
  font-size: 12px;
  background: transparent;
  color: var(--accent, #8b4513);
  padding: 2px 8px;
  border: 1px solid var(--border, #d4c5a9);
}

.ep-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 6px 0;
}

.ep-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 3px solid transparent;
}

.ep-item:hover {
  background: #fdf6ec;
}

.ep-tone {
  border-left-color: #e53935;
}

.ep-rhyme {
  border-left-color: #ff9800;
}

.ep-multi {
  border-left-color: #9c27b0;
}

.ep-unknown {
  border-left-color: #999;
}

.ep-loc {
  color: var(--text-muted, #8b7355);
  font-size: 11px;
  white-space: nowrap;
  min-width: 70px;
}

.ep-char {
  color: var(--accent, #8b4513);
  font-weight: 600;
  white-space: nowrap;
}

.ep-msg {
  color: var(--text, #3e2c1c);
  flex: 1;
}
</style>
