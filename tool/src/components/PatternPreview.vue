<template>
  <div class="pattern-preview" :class="{ 'pp-collapsed': collapsed }">
    <div class="pp-header">
      <div class="pp-title">
        <span class="pp-name">{{ pattern?.name || '未选择格律' }}</span>
        <span v-if="pattern" class="pp-meta">
          {{ pattern.charCount || totalChars }} 字 · {{ sentenceCount }} 句
          <span v-if="pattern.sourceFormat" class="pp-meta-fmt">{{ pattern.sourceFormat }}</span>
        </span>
      </div>
      <div class="pp-right">
        <div class="pp-legend">
          <span class="pp-leg"><i class="pp-dot pp-dot-ping"></i>平</span>
          <span class="pp-leg"><i class="pp-dot pp-dot-ze"></i>仄</span>
          <span class="pp-leg"><i class="pp-dot pp-dot-ke"></i>中</span>
          <span class="pp-leg"><i class="pp-dot pp-dot-yun"></i>韵</span>
        </div>
        <button class="pp-toggle" type="button" @click="collapsed = !collapsed">
          {{ collapsed ? '展开格律' : '收起' }}
        </button>
      </div>
    </div>

    <!-- 多格式变体选择器（格一/格二/变格/别格…） -->
    <div v-if="formats.length > 1" class="pp-format-bar">
      <span class="pp-format-label">变体</span>
      <div class="pp-format-btns">
        <button
          v-for="(f, fi) in formats"
          :key="fi"
          type="button"
          class="pp-format-btn"
          :class="{ active: fi === formatIndex }"
          @click="emit('change-format', fi)"
        >{{ f.label }}</button>
      </div>
    </div>

    <div v-if="!collapsed && sentences.length" class="pp-body">
      <div v-for="(s, si) in sentences" :key="si" class="pp-row">
        <span class="pp-row-no">{{ si + 1 }}</span>
        <span
          v-for="(tone, ci) in s.pattern"
          :key="ci"
          class="pp-cell"
          :class="cellClass(tone)"
          :title="cellTitle(tone)"
          @click="onCellClick(si, ci)"
        >{{ cellLabel(tone) }}</span>
        <span
          v-if="s.isRhyme"
          class="pp-rhyme-tag"
          :class="s.rhymeType === '仄韵' ? 'pp-rhyme-ze' : 'pp-rhyme-ping'"
        >{{ s.rhymeType || '韵' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  pattern: { type: Object, default: null },
  formats: { type: Array, default: () => [] },
  formatIndex: { type: Number, default: 0 }
})

const emit = defineEmits(['jump', 'change-format'])

const collapsed = ref(false)

const sentences = computed(() => props.pattern?.sentences || [])
const sentenceCount = computed(() => sentences.value.length)
const totalChars = computed(() =>
  sentences.value.reduce((sum, s) => sum + (s.pattern?.length || 0), 0)
)

function cellClass(tone) {
  return {
    'pp-ping': tone === '平',
    'pp-ze': tone === '仄',
    'pp-ke': tone === '可平可仄',
    'pp-yun': tone === '韵脚'
  }
}

function cellLabel(tone) {
  const map = { '平': '平', '仄': '仄', '可平可仄': '中', '韵脚': '韵' }
  return map[tone] || tone
}

function cellTitle(tone) {
  const map = { '平': '平声', '仄': '仄声', '可平可仄': '可平可仄', '韵脚': '韵脚' }
  return map[tone] || tone
}

/** 点击格律字格 → 跳转到编辑器对应位置 */
function onCellClick(si, ci) {
  emit('jump', si, ci)
}
</script>

<style scoped>
.pattern-preview {
  background: var(--paper-card);
  border: 1px solid var(--border-light);
  border-radius: 6px;
  margin: 12px 0 4px;
  overflow: hidden;
}

.pp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 8px 14px;
}

.pp-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.pp-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
}

.pp-meta {
  font-size: 11px;
  color: var(--ink-muted);
  white-space: nowrap;
}

.pp-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pp-legend {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--ink-muted);
  align-items: center;
}

.pp-leg { display: flex; align-items: center; gap: 4px; }

.pp-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.pp-dot-ping { background: var(--ping-bg); border: 1px solid var(--ping-text); }
.pp-dot-ze   { background: transparent; border: 1px solid var(--ze-text); }
.pp-dot-ke   { background: var(--multi-bg); border: 1px solid var(--multi-border); }
.pp-dot-yun  { background: transparent; border: 1px solid var(--rhyme-border); }

.pp-toggle {
  font-size: 11px;
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: transparent;
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.pp-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ── 变体选择器 ── */
.pp-format-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 10px;
  flex-wrap: wrap;
}
.pp-format-label {
  font-size: 11px;
  color: var(--ink-muted);
  flex-shrink: 0;
}
.pp-format-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pp-format-btn {
  font-size: 11px;
  padding: 3px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--paper-card);
  color: var(--ink-light);
  cursor: pointer;
  transition: all 0.15s;
}
.pp-format-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.pp-format-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
}

.pp-meta-fmt {
  margin-left: 6px;
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 7px;
  border-radius: 8px;
}

.pp-body {
  padding: 6px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
}

.pp-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.pp-row-no {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 10px;
  color: var(--ink-muted);
  background: var(--accent-soft);
  border-radius: 50%;
  flex-shrink: 0;
}

.pp-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s;
  border: 1px solid transparent;
}
.pp-cell:hover { transform: scale(1.15); }

.pp-ping { background: var(--ping-bg); color: var(--ping-text); border-color: rgba(61, 90, 128, 0.25); }
.pp-ze   { background: transparent; color: var(--ze-text); border-color: rgba(92, 92, 92, 0.25); }
.pp-ke   { background: var(--multi-bg); color: var(--multi-text); border-color: rgba(124, 107, 142, 0.25); }
.pp-yun  {
  background: #fdf9ee;
  color: #8a6d2f;
  border-color: var(--rhyme-border);
  box-shadow: 0 0 0 2px rgba(184, 149, 74, 0.25);
}

.pp-rhyme-tag {
  margin-left: 6px;
  font-size: 10px;
  padding: 1px 8px;
  border-radius: 9px;
  flex-shrink: 0;
}
.pp-rhyme-ping { background: var(--ping-bg); color: var(--ping-text); }
.pp-rhyme-ze   { background: #f0ece4; color: var(--ze-text); }

@media (max-width: 640px) {
  .pp-cell { width: 22px; height: 22px; font-size: 11px; }
  .pp-rhyme-tag { display: none; }
}
</style>
