<template>
  <div class="poetry-editor">
    <!-- 输入区 -->
    <div class="editor-input-area">
      <textarea
        ref="textareaRef"
        v-model="text"
        class="editor-textarea"
        :placeholder="placeholder"
        rows="8"
        spellcheck="false"
      ></textarea>
      <div class="editor-stats">
        <span>已输入 <strong>{{ charCount }}</strong> 字</span>
        <span v-if="pattern">（模板要求 <strong>{{ pattern.charCount }}</strong> 字）</span>
        <span v-if="stats" class="stats-detail">
          正确 <strong class="stat-ok">{{ stats.okCount }}</strong>
          <span v-if="stats.errorCount > 0"> · 出律 <strong class="stat-err">{{ stats.errorCount }}</strong></span>
          <span v-if="stats.multiCount > 0"> · 多音 <strong class="stat-multi">{{ stats.multiCount }}</strong></span>
        </span>
      </div>
    </div>

    <!-- 格律可视化：始终显示完整格律网格 -->
    <div class="editor-pattern-view">
      <!-- 未选模板 -->
      <div v-if="!pattern" class="pv-empty">
        请先选择格律模板
      </div>

      <!-- 已选模板 → 始终渲染完整格律网格 -->
      <div v-else class="pv-lines">
        <div
          v-for="(sentence, si) in pattern.sentences"
          :key="si"
          class="pv-line"
        >
          <span class="pv-line-num">{{ si + 1 }}</span>
          <template v-for="(tone, ci) in sentence.pattern" :key="ci">
            <!-- 已输入 → 显示分析结果 -->
            <CharToken
              v-if="hasChar(si, ci)"
              :char="getChar(si, ci).char"
              :expected="getChar(si, ci).expected"
              :actual="getChar(si, ci).actual"
              :is-rhyme="getChar(si, ci).isRhyme"
              :rhyme-group="getChar(si, ci).rhymeGroup"
              :status="getChar(si, ci).status"
              @click="onCharClick(si, ci, getChar(si, ci))"
            />
            <!-- 未输入 → 显示格律预览符号 -->
            <span
              v-else
              class="pattern-cell"
              :class="patternCellClass(tone, sentence.isRhyme, ci === sentence.pattern.length - 1 && tone !== '韵脚')"
              :title="patternCellTitle(tone, sentence.isRhyme, ci === sentence.pattern.length - 1)"
            >
              {{ patternCellLabel(tone) }}
            </span>
          </template>
          <span v-if="sentence.isRhyme" class="rhyme-dot">韵</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CharToken from './CharToken.vue'

const props = defineProps({
  text: { type: String, default: '' },
  pattern: { type: Object, default: null },
  matchResults: { type: Array, default: () => [] },
  stats: { type: Object, default: null }
})

const emit = defineEmits(['update:text', 'char-click'])

const textareaRef = ref(null)

const text = computed({
  get: () => props.text,
  set: (val) => emit('update:text', val)
})

const placeholder = computed(() => {
  if (!props.pattern) return '请先选择格律模板...'
  return `请输入${props.pattern.name || '诗词'}内容，每句一行...`
})

const charCount = computed(() => {
  return [...(props.text || '')].filter(c => !/\s/.test(c)).length
})

function onCharClick(li, ci, item) {
  emit('char-click', { line: li, col: ci, ...item })
}

// 按句、按字索引从 matchResults 中取数据
function hasChar(si, ci) {
  return props.matchResults[si] && props.matchResults[si][ci]
}
function getChar(si, ci) {
  return props.matchResults[si][ci]
}

// 格律预览辅助
function patternCellClass(tone, isRhyme, isLast) {
  return {
    'pc-ping': tone === '平',
    'pc-ze': tone === '仄',
    'pc-ke': tone === '可平可仄' || tone === '中',
    'pc-yun': tone === '韵脚' || (isRhyme && isLast),
  }
}
function patternCellLabel(tone) {
  const map = { '平': '平', '仄': '仄', '可平可仄': '中', '中': '中', '韵脚': '韵' }
  return map[tone] || '?'
}
function patternCellTitle(tone, isRhyme, isLast) {
  const parts = [tone]
  if (isRhyme && isLast) parts.push('(韵脚)')
  return parts.join(' ')
}
</script>

<style scoped>
.poetry-editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 输入区 */
.editor-input-area {
  background: var(--bg-card, #fffef9);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(62, 44, 28, 0.06);
  padding: 16px;
}

.editor-textarea {
  width: 100%;
  resize: vertical;
  font-family: var(--font, 'Noto Serif SC', 'SimSun', serif);
  font-size: 18px;
  line-height: 2;
  padding: 12px;
  border: 1px solid var(--border, #d4c5a9);
  border-radius: 6px;
  background: var(--bg-card, #fffef9);
  color: var(--text, #3e2c1c);
  outline: none;
}

.editor-textarea:focus {
  border-color: var(--accent, #8b4513);
  box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.1);
}

.editor-stats {
  display: flex;
  gap: 16px;
  align-items: center;
  font-size: 13px;
  color: var(--text-muted, #8b7355);
  margin-top: 8px;
  flex-wrap: wrap;
}

.editor-stats strong {
  color: var(--accent, #8b4513);
}

.stat-ok { color: #27ae60; }
.stat-err { color: #e53935; }
.stat-multi { color: #9c27b0; }

/* 格律可视化区 */
.editor-pattern-view {
  background: var(--bg-card, #fffef9);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(62, 44, 28, 0.06);
  padding: 16px;
  min-height: 100px;
}

.pv-empty {
  color: var(--text-muted, #8b7355);
  font-style: italic;
  text-align: center;
  padding: 30px 0;
}

.pv-lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pv-line {
  display: flex;
  align-items: center;
  gap: 0;
  flex-wrap: wrap;
}

.pv-line-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 11px;
  color: var(--text-muted, #8b7355);
  background: #f0e6d3;
  border-radius: 50%;
  margin-right: 6px;
  flex-shrink: 0;
}

/* 格律预览单元格（与后台 PatternGrid 同色） */
.pattern-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 4px;
  margin: 2px;
  border: 2px solid transparent;
  user-select: none;
}

.pc-ping {
  background: #dceefb;
  border-color: #90caf9;
  color: #1565c0;
}

.pc-ze {
  background: #fafafa;
  border-color: #ddd;
  color: #555;
}

.pc-ke {
  background: #e8f5e9;
  border-color: #a5d6a7;
  color: #2e7d32;
}

.pc-yun {
  background: #fff8e1;
  border-color: #ffb74d;
  color: #e65100;
  box-shadow: 0 0 0 2px rgba(255, 183, 77, 0.3);
}

.rhyme-dot {
  font-size: 10px;
  background: #ff9800;
  color: #fff;
  padding: 1px 5px;
  border-radius: 8px;
  margin-left: 4px;
}
</style>
