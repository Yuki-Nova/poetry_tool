<template>
  <div class="preview-pane">
    <h3>格律预览</h3>
    <div v-if="!sentences?.length" class="preview-empty">暂无格律数据</div>
    <div v-else class="preview-content">
      <div v-for="(sentence, si) in sentences" :key="si" class="preview-line">
        <span class="line-num">{{ si + 1 }}</span>
        <span v-for="(tone, ci) in sentence.pattern" :key="ci" class="char-block" :class="blockClass(tone, sentence, ci)">
          {{ blockChar(tone) }}
        </span>
        <span v-if="sentence.isRhyme" class="rhyme-tag">{{ sentence.rhymeType || '韵' }}</span>
      </div>
    </div>
    <div v-if="sentences?.length" class="preview-stats">
      共 <strong>{{ totalChars }}</strong> 字，{{ sentences.length }} 句，{{ rhymeCount }} 处押韵
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ sentences: { type: Array, default: () => [] } })

const totalChars = computed(() => props.sentences.reduce((sum, s) => sum + (s.length || s.pattern.length), 0))
const rhymeCount = computed(() => props.sentences.filter(s => s.isRhyme).length)

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
  background: var(--paper-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 20px;
}

.preview-pane h3 {
  font-size: 15px; font-weight: 600; color: var(--ink);
  margin-bottom: 16px; padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.preview-empty { color: var(--ink-muted); font-style: italic; padding: 20px 0; text-align: center; }

.preview-content { display: flex; flex-direction: column; gap: 8px; }

.preview-line { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }

.line-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; font-size: 11px;
  color: var(--ink-muted); background: var(--accent-soft);
  border-radius: 50%; margin-right: 4px;
}

.char-block {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 4px;
  font-size: 16px; font-weight: 600; border: 1.5px solid transparent;
}

.b-ping { background: var(--ping-bg); border-color: var(--ping-border); color: var(--ping-text); }
.b-ze   { background: var(--ze-bg); border-color: var(--ze-border); color: var(--ze-text); }
.b-ke   { background: var(--ke-bg); border-color: var(--ke-border); color: var(--ke-text); }
.b-yun  { background: var(--yun-bg); border-color: var(--yun-border); color: var(--yun-text); box-shadow: 0 0 0 2px rgba(212,184,96,0.3); }

.rhyme-tag {
  font-size: 10px; background: var(--yun-bg); color: var(--yun-text);
  padding: 1px 6px; border-radius: 8px; margin-left: 4px;
}

.preview-stats {
  margin-top: 14px; padding-top: 10px;
  border-top: 1px dashed var(--border);
  font-size: 12px; color: var(--ink-muted);
}
.preview-stats strong { color: var(--accent); }
</style>
