<template>
  <div class="preview-pane">
    <h3>格律预览</h3>
    <div v-if="!sentences || sentences.length === 0" class="preview-empty">
      暂无格律数据
    </div>
    <div v-else class="preview-content">
      <div
        v-for="(sentence, si) in sentences"
        :key="si"
        class="preview-line"
      >
        <span class="line-num">{{ si + 1 }}</span>
        <span
          v-for="(tone, ci) in sentence.pattern"
          :key="ci"
          class="char-block"
          :class="blockClass(tone, sentence, ci)"
        >
          {{ blockChar(tone) }}
        </span>
        <span v-if="sentence.isRhyme" class="rhyme-tag">{{ sentence.rhymeType || '韵' }}</span>
      </div>
    </div>

    <!-- 统计信息 -->
    <div v-if="sentences && sentences.length > 0" class="preview-stats">
      共 <strong>{{ totalChars }}</strong> 字，
      {{ sentences.length }} 句，
      {{ rhymeCount }} 处押韵
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sentences: {
    type: Array,
    default: () => []
  }
})

const totalChars = computed(() =>
  props.sentences.reduce((sum, s) => sum + (s.length || s.pattern.length), 0)
)

const rhymeCount = computed(() =>
  props.sentences.filter(s => s.isRhyme).length
)

function blockClass(tone, sentence, ci) {
  const isLast = ci === sentence.pattern.length - 1
  return {
    'b-ping': tone === '平',
    'b-ze': tone === '仄',
    'b-ke': tone === '可平可仄',
    'b-yun': tone === '韵脚' || (sentence.isRhyme && isLast)
  }
}

function blockChar(tone) {
  const map = { '平': '○', '仄': '●', '可平可仄': '◐', '韵脚': '◎' }
  return map[tone] || '?'
}
</script>

<style scoped>
.preview-pane {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
}

.preview-pane h3 {
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.preview-empty {
  color: var(--text-muted);
  font-style: italic;
  padding: 20px 0;
  text-align: center;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-line {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.line-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11px;
  color: var(--text-muted);
  background: #f0e6d3;
  border-radius: 50%;
  margin-right: 4px;
}

.char-block {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  border: 1.5px solid transparent;
}

.b-ping {
  background: #dceefb;
  border-color: #90caf9;
  color: #1565c0;
}

.b-ze {
  background: #f5f5f5;
  border-color: #ccc;
  color: #555;
}

.b-ke {
  background: #e8f5e9;
  border-color: #a5d6a7;
  color: #2e7d32;
}

.b-yun {
  background: #fff8e1;
  border-color: #ffb74d;
  color: #e65100;
  box-shadow: 0 0 0 2px rgba(255, 183, 77, 0.3);
}

.rhyme-tag {
  font-size: 11px;
  background: #fff3e0;
  color: #e65100;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: 4px;
}

.preview-stats {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  font-size: 13px;
  color: var(--text-muted);
}

.preview-stats strong {
  color: var(--accent);
}
</style>
