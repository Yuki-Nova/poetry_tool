<template>
  <div class="pattern-selector" ref="rootEl">
    <label class="selector-label">格律：</label>

    <!-- 搜索输入框 -->
    <div class="search-wrapper" @click="open = true">
      <input
        ref="inputEl"
        v-model="query"
        class="search-input"
        :placeholder="currentName || '搜索格律模板...'"
        @focus="open = true"
        @keydown.down.prevent="moveDown"
        @keydown.up.prevent="moveUp"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.escape="open = false"
      />
      <button class="search-clear" v-if="query" @click.stop="query = ''">✕</button>
      <span class="search-arrow" :class="{ open }">▾</span>
    </div>

    <!-- 下拉面板 -->
    <div v-if="open" class="dropdown-panel">
      <div v-if="filtered.length === 0" class="dropdown-empty">
        无匹配结果
      </div>
      <div
        v-for="(item, idx) in filtered"
        :key="item.id"
        class="dropdown-item"
        :class="{
          active: item.id === selectedId,
          highlighted: idx === highlightIdx
        }"
        @click="selectItem(item)"
        @mouseenter="highlightIdx = idx"
      >
        <span class="item-name">{{ item.label }}</span>
        <span class="item-tag">{{ item.type }}</span>
        <span v-if="item.charCount" class="item-count">{{ item.charCount }}字</span>
      </div>
    </div>

    <!-- 点击遮罩关闭 -->
    <div v-if="open" class="dropdown-mask" @click="open = false"></div>

    <!-- 当前模板简介 -->
    <div v-if="current" class="pattern-info">
      <span class="pattern-type">{{ current.type }}</span>
      <span v-if="current.charCount" class="pattern-count">{{ current.charCount }} 字</span>
      <span v-if="current.notes" class="pattern-notes">{{ current.notes }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  grouped: { type: Object, required: true },
  current: { type: Object, default: null },
  selectedId: { type: String, default: '' }
})

const emit = defineEmits(['select'])

const query = ref('')
const open = ref(false)
const highlightIdx = ref(0)
const rootEl = ref(null)
const inputEl = ref(null)

// 展平所有格律为搜索列表
const allPatterns = computed(() => {
  const list = []
  for (const [group, patterns] of Object.entries(props.grouped)) {
    for (const p of patterns) {
      list.push({ ...p, group })
    }
  }
  return list
})

// 当前选中名称
const currentName = computed(() => props.current?.label || '')

// 过滤（匹配名称、别名、类型、韵格）
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allPatterns.value
  return allPatterns.value.filter(p => {
    return p.label.toLowerCase().includes(q)
      || (p.id && p.id.toLowerCase().includes(q))
      || (p.alias && p.alias.some(a => a.toLowerCase().includes(q)))
      || (p.type && p.type.toLowerCase().includes(q))
      || (p.notes && p.notes.toLowerCase().includes(q))
  })
})

// 键盘导航
function moveDown() {
  highlightIdx.value = Math.min(highlightIdx.value + 1, filtered.value.length - 1)
}
function moveUp() {
  highlightIdx.value = Math.max(highlightIdx.value - 1, 0)
}
function selectHighlighted() {
  const item = filtered.value[highlightIdx.value]
  if (item) selectItem(item)
}

function selectItem(item) {
  emit('select', item.id)
  query.value = ''
  open.value = false
  highlightIdx.value = 0
}

watch(open, (val) => {
  if (val) highlightIdx.value = 0
})

// 点击外部关闭
function onClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.pattern-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--bg-card, #fffef9);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(62, 44, 28, 0.06);
  position: relative;
  z-index: 10;
}

.selector-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #3e2c1c);
  white-space: nowrap;
}

/* 搜索框 */
.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 220px;
}

.search-input {
  width: 100%;
  padding: 6px 30px 6px 10px;
  font-size: 14px;
  border: 1px solid var(--border, #d4c5a9);
  border-radius: 6px;
  background: var(--bg-card, #fffef9);
  color: var(--text, #3e2c1c);
  outline: none;
  cursor: pointer;
}
.search-input:focus {
  border-color: var(--accent, #8b4513);
}

.search-clear {
  position: absolute;
  right: 20px;
  background: none;
  border: none;
  color: #aaa;
  cursor: pointer;
  padding: 0 4px;
  font-size: 12px;
}
.search-arrow {
  position: absolute;
  right: 6px;
  font-size: 10px;
  color: var(--text-muted, #8b7355);
  pointer-events: none;
  transition: transform 0.15s;
}
.search-arrow.open {
  transform: rotate(180deg);
}

/* 下拉 */
.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 80px;
  right: 0;
  max-width: 420px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-card, #fffef9);
  border: 1px solid var(--border, #d4c5a9);
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(62, 44, 28, 0.14);
  z-index: 20;
  margin-top: 4px;
}

.dropdown-empty {
  padding: 20px;
  text-align: center;
  color: var(--text-muted, #8b7355);
  font-size: 13px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.08s;
}
.dropdown-item:hover,
.dropdown-item.highlighted {
  background: #fdf6ec;
}
.dropdown-item.active {
  background: #fdf0e0;
  font-weight: 600;
  color: var(--accent, #8b4513);
}

.item-name {
  flex: 1;
}
.item-tag {
  font-size: 11px;
  background: #f0e6d3;
  color: var(--accent, #8b4513);
  padding: 1px 7px;
  border-radius: 8px;
}
.item-count {
  font-size: 11px;
  color: var(--text-muted, #8b7355);
}

.dropdown-mask {
  position: fixed;
  inset: 0;
  z-index: 15;
}

/* 简介 */
.pattern-info {
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted, #8b7355);
}
.pattern-type {
  background: #f0e6d3;
  color: var(--accent, #8b4513);
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.pattern-count {
  color: var(--accent, #8b4513);
}
.pattern-notes {
  color: #aaa;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
