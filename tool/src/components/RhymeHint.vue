<template>
  <div class="rhyme-hint">
    <div class="rhyme-head">
      <span class="rhyme-dot" :class="{ valid: rhymeResult?.valid, invalid: rhymeResult && !rhymeResult.valid }"></span>
      <span v-if="rhymeResult?.group" class="rhyme-group">{{ rhymeResult.group }}</span>
      <span v-else class="rhyme-none">暂无押韵</span>
      <span v-if="rhymeResult?.group" class="rhyme-book-tag">{{ rhymeResult.rhymeBookLabel }}</span>
    </div>

    <div v-if="rhymeResult?.errors?.length" class="rhyme-errors">
      <div v-for="err in rhymeResult.errors" :key="err.index" class="rhyme-err-item">
        第{{ err.index + 1 }}句 「{{ err.char }}」{{ err.group ? `属「${err.group}」` : '未收录' }}
      </div>
    </div>

    <div v-if="sameRhymeChars.length" class="rhyme-ref">
      <span class="rhyme-ref-label">同韵字</span>
      <span class="rhyme-ref-chars">{{ sameRhymeChars.slice(0, 24).join('、') }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import xinyun from '../data/rhymes/xinyun.json'
import pingshui from '../data/rhymes/pingshui.json'
import cilin from '../data/rhymes/cilin.json'

const BOOKS = { xinyun, pingshui, cilin }

const props = defineProps({
  rhymeResult: { type: Object, default: null },
  rhymeBook: { type: String, default: 'xinyun' }
})

const sameRhymeChars = computed(() => {
  if (!props.rhymeResult?.group) return []
  const book = BOOKS[props.rhymeBook]
  if (!book) return []
  const group = book.groups.find(g => g.name === props.rhymeResult.group)
  return group?.chars || []
})
</script>

<style scoped>
.rhyme-hint {
  background: var(--paper-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  padding: 14px 16px;
}

.rhyme-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rhyme-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--ink-muted);
  flex-shrink: 0;
}
.rhyme-dot.valid { background: var(--success); }
.rhyme-dot.invalid { background: var(--warning); }

.rhyme-group {
  font-weight: 700;
  font-size: 15px;
  color: var(--ink);
}

.rhyme-none {
  color: var(--ink-muted);
  font-size: 13px;
}

.rhyme-book-tag {
  font-size: 10px;
  color: var(--ink-muted);
  background: var(--paper-warm);
  padding: 1px 7px;
  border-radius: 8px;
}

.rhyme-errors { margin-top: 10px; }

.rhyme-err-item {
  font-size: 12px;
  color: var(--warning);
  padding: 3px 0;
}

.rhyme-ref {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-light);
}

.rhyme-ref-label {
  font-size: 11px;
  color: var(--ink-muted);
  margin-right: 6px;
}

.rhyme-ref-chars {
  font-size: 13px;
  color: var(--ink-light);
  line-height: 2;
}
</style>
