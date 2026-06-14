<template>
  <div class="rhyme-hint">
    <!-- 韵书选择栏 -->
    <div class="rhyme-book-bar">
      <span class="rb-label">韵书：</span>
      <button
        v-for="(label, key) in RHYME_BOOK_LABELS"
        :key="key"
        class="rb-btn"
        :class="{ active: rhymeBook === key }"
        @click="$emit('update:rhymeBook', key)"
      >
        {{ label }}
      </button>
    </div>

    <div v-if="rhymeResult && rhymeResult.group" class="rhyme-body">
      <div class="rhyme-header">
        <span class="rhyme-icon">{{ rhymeResult.valid ? '✅' : '⚠️' }}</span>
        <span class="rhyme-title">押韵：{{ rhymeResult.group }}</span>
        <span class="rhyme-book-name">（{{ rhymeResult.rhymeBookLabel }}）</span>
      </div>

      <div v-if="!rhymeResult.valid && rhymeResult.errors.length > 0" class="rhyme-errors">
        <div v-for="err in rhymeResult.errors" :key="err.index" class="rhyme-error-item">
          第 {{ err.index + 1 }} 句 "{{ err.char }}" —
          {{ err.group ? `属「${err.group}」韵，与「${rhymeResult.group}」不同` : '未收录' }}
        </div>
      </div>

      <div v-if="sameRhymeChars.length > 0" class="rhyme-same-group">
        <span class="rhyme-subtitle">同韵部字：</span>
        <span class="rhyme-chars">{{ sameRhymeChars.slice(0, 30).join('、') }}</span>
      </div>
    </div>

    <div v-else class="rhyme-empty">
      暂无押韵信息
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import xinyunData from '../data/rhymes/xinyun.json'
import pingshuiData from '../data/rhymes/pingshui.json'
import cilinData from '../data/rhymes/cilin.json'
import { RHYME_BOOK_LABELS } from '../core/rhymeChecker'

const BOOK_DATA = { xinyun: xinyunData, pingshui: pingshuiData, cilin: cilinData }
const props = defineProps({
  rhymeResult: { type: Object, default: null },
  rhymeBook: { type: String, default: 'xinyun' }
})

defineEmits(['update:rhymeBook'])

const sameRhymeChars = computed(() => {
  if (!props.rhymeResult?.group) return []
  const book = BOOK_DATA[props.rhymeBook]
  if (!book) return []
  const group = book.groups.find(g => g.name === props.rhymeResult.group)
  return group?.chars || []
})
</script>

<style scoped>
.rhyme-hint {
  background: var(--bg-card, #fffef9);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(62, 44, 28, 0.06);
  overflow: hidden;
}

.rhyme-book-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: #fdf6ec;
  border-bottom: 1px solid var(--border, #d4c5a9);
}

.rb-label {
  font-size: 12px;
  color: var(--text-muted, #8b7355);
  margin-right: 4px;
}

.rb-btn {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid var(--border, #d4c5a9);
  border-radius: 10px;
  background: #fff;
  color: var(--text-muted, #8b7355);
  cursor: pointer;
  transition: all 0.15s;
}

.rb-btn.active {
  background: var(--accent, #8b4513);
  color: #fff;
  border-color: var(--accent, #8b4513);
}

.rb-btn:hover:not(.active) {
  border-color: var(--accent, #8b4513);
  color: var(--accent, #8b4513);
}

.rhyme-body {
  padding: 14px 16px;
}

.rhyme-empty {
  padding: 14px 16px;
  color: var(--text-muted, #8b7355);
  font-style: italic;
  text-align: center;
}

.rhyme-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.rhyme-icon { font-size: 16px; }

.rhyme-title {
  font-weight: 600;
  color: var(--accent, #8b4513);
  font-size: 15px;
}

.rhyme-book-name {
  font-size: 11px;
  color: var(--text-muted, #8b7355);
  font-weight: 400;
}

.rhyme-errors { margin: 8px 0; }

.rhyme-error-item {
  color: #c0392b;
  padding: 3px 0;
  font-size: 12px;
}

.rhyme-same-group { margin-top: 10px; }

.rhyme-subtitle {
  color: var(--text-muted, #8b7355);
  font-size: 11px;
}

.rhyme-chars {
  color: var(--accent, #8b4513);
  line-height: 1.8;
}
</style>
