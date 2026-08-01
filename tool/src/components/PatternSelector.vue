<template>
  <div class="pattern-selector" ref="rootEl">
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
      <span class="search-icon">&#x25BE;</span>
    </div>

    <div v-if="current" class="current-badge">
      <span class="badge-type">{{ current.type }}</span>
      <span v-if="current.charCount" class="badge-count">{{ current.charCount }} 字</span>
    </div>

    <!-- 下拉 -->
    <div v-if="open" class="dropdown">
      <div v-if="filtered.length === 0" class="dropdown-empty">无匹配</div>
      <div
        v-for="(item, idx) in filtered"
        :key="item.id"
        class="dropdown-item"
        :class="{ active: item.id === selectedId, hl: idx === highlightIdx }"
        @click="selectItem(item)"
        @mouseenter="highlightIdx = idx"
      >
        <span class="item-name">{{ item.label }}</span>
        <span class="item-tag">{{ item.type }}</span>
        <span v-if="item.charCount" class="item-count">{{ item.charCount }}字</span>
      </div>
    </div>

    <div v-if="open" class="dropdown-mask" @click="open = false"></div>
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

const allPatterns = computed(() => {
  const list = []
  for (const [, patterns] of Object.entries(props.grouped)) {
    for (const p of patterns) list.push(p)
  }
  return list
})

const currentName = computed(() => props.current?.label || '')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allPatterns.value
  return allPatterns.value.filter(p =>
    p.label.toLowerCase().includes(q)
    || (p.id && p.id.toLowerCase().includes(q))
    || (p.alias && p.alias.some(a => a.toLowerCase().includes(q)))
    || (p.type && p.type.toLowerCase().includes(q))
    || (p.notes && p.notes.toLowerCase().includes(q))
  )
})

function moveDown() { highlightIdx.value = Math.min(highlightIdx.value + 1, filtered.value.length - 1) }
function moveUp() { highlightIdx.value = Math.max(highlightIdx.value - 1, 0) }
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

watch(open, (val) => { if (val) highlightIdx.value = 0 })

function onClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) open.value = false
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
  margin-bottom: 14px;
  position: relative;
  z-index: 10;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 280px;
  padding: 7px 30px 7px 12px;
  font-size: 14px;
  font-family: inherit;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--paper-card);
  color: var(--ink);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: var(--accent); }
.search-input::placeholder { color: var(--ink-muted); }

.search-icon {
  position: absolute;
  right: 10px;
  font-size: 14px;
  color: var(--ink-muted);
  pointer-events: none;
}

.current-badge {
  display: flex;
  gap: 6px;
  align-items: center;
}

.badge-type {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
}

.badge-count {
  font-size: 11px;
  color: var(--ink-muted);
}

/* 下拉 */
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 400px;
  max-width: calc(100vw - 40px);
  max-height: 340px;
  overflow-y: auto;
  background: var(--paper-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
  z-index: 20;
  margin-top: 4px;
}

.dropdown-empty {
  padding: 24px;
  text-align: center;
  color: var(--ink-muted);
  font-size: 13px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.06s;
}
.dropdown-item:hover, .dropdown-item.hl {
  background: var(--paper-warm);
}
.dropdown-item.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.item-name { flex: 1; }
.item-tag {
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 7px;
  border-radius: 8px;
}
.item-count { font-size: 11px; color: var(--ink-muted); }

.dropdown-mask { position: fixed; inset: 0; z-index: 15; }

/* ── 移动端适配 ── */
@media (max-width: 640px) {
  .search-input { width: 100%; min-width: 0; }
  .dropdown { width: min(400px, calc(100vw - 28px)); }
}
</style>
