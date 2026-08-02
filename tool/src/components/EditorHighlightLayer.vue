<template>
  <div class="highlight-layer">
    <div v-for="(line, li) in lines" :key="li" class="hl-line">
      <span
        v-for="(ch, ci) in [...line]"
        :key="`${li}-${ci}`"
        class="hl-char"
        :class="charClass(li, ci)"
        @mouseenter="onCharEnter($event, li, ci, ch)"
        @mouseleave="onCharLeave"
        @click="onCharClick(li, ci, ch)"
      >{{ ch }}</span>
      <span class="hl-newline">&#8203;</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lines: { type: Array, default: () => [''] },
  matchResults: { type: Array, default: () => [] },
  activeLine: { type: Number, default: 0 },
  activeCol: { type: Number, default: 0 },
  // 押韵错误（出韵/未收录）：{line, col, char}[]，用于红色标记韵脚
  rhymeErrors: { type: Array, default: () => [] }
})

const emit = defineEmits(['char-hover', 'char-click'])

// 出韵/未收录韵脚行号 → 字符列 索引（便于 O(1) 判断）
const rhymeErrorSet = computed(() => {
  const set = new Set()
  for (const e of props.rhymeErrors || []) {
    if (e.line !== undefined && e.col !== undefined) set.add(`${e.line}:${e.col}`)
  }
  return set
})

function getResult(li, ci) {
  if (!props.matchResults[li]) return null
  return props.matchResults[li][ci] || null
}

function charClass(li, ci) {
  const r = getResult(li, ci)
  if (!r) return ''
  const cls = []

  // 出韵/未收录的韵脚：红色标记（最高优先，覆盖韵脚淡黄底）
  if (r.isRhyme && rhymeErrorSet.value.has(`${li}:${ci}`)) {
    cls.push('t-rhyme-out')
    if (li === props.activeLine && ci === props.activeCol) cls.push('cursor')
    return cls
  }

  switch (r.status) {
    case 'ok':
    case 'ok-rhyme':
      // 韵脚（isRhyme）一律淡黄高亮；诗体 pattern 韵脚位是平/仄（status=ok），
      // 词牌是「韵脚」（status=ok-rhyme），两者统一以 isRhyme 判定
      cls.push(r.actual === '平' ? 't-ping' : 't-ze')
      if (r.isRhyme) cls.push('t-rhyme')
      break
    case 'rhyme-warn':
      cls.push('t-rhyme-err')
      break
    case 'tone-error':
      cls.push('t-err')
      break
    case 'multi-tone':
      cls.push('t-multi')
      break
    case 'unknown':
      cls.push('t-unk')
      break
    case 'skip':
      cls.push('t-skip')
      break
  }

  if (li === props.activeLine && ci === props.activeCol) cls.push('cursor')

  return cls
}

function onCharEnter(e, li, ci, ch) {
  const r = getResult(li, ci)
  const payload = { line: li, col: ci, char: ch, x: e.clientX, y: e.clientY, error: null }
  if (r && (r.status === 'tone-error' || r.status === 'rhyme-warn' || r.status === 'multi-tone')) {
    payload.error = {
      line: li, col: ci, char: ch,
      status: r.status,
      expected: r.expected,
      actual: r.actual,
      isRhyme: r.isRhyme,
      rhymeGroup: r.rhymeGroup
    }
  }
  emit('char-hover', payload)
}

function onCharLeave() { emit('char-hover', { error: null }) }

function onCharClick(li, ci, ch) {
  const r = getResult(li, ci)
  emit('char-click', { line: li, col: ci, char: ch, ...(r || {}) })
}
</script>

<style scoped>
.highlight-layer {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  padding: 10px 14px;
  pointer-events: none;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 2.2;
  font-size: 20px;
  font-family: inherit;
  overflow: hidden;
  color: var(--ink);
}

.hl-line { min-height: 44px; }

.hl-char {
  pointer-events: auto;
  cursor: default;
  position: relative;
  color: var(--ink);
}

.hl-newline { pointer-events: none; }

/* ── 平声（蓝灰调）── */
.t-ping {
  color: var(--ping-text);
  background: var(--ping-bg);
  border-radius: 2px;
}

/* ── 仄声（无底，暗字）── */
.t-ze {
  color: var(--ze-text);
}

/* ── 韵脚正确（淡黄高亮 + 金字）── */
.t-rhyme {
  background: #fdf6e3;
  box-shadow: 0 0 0 1px var(--rhyme-border);
  border-radius: 2px;
  font-weight: 600;
}

/* ── 韵脚声调不符（rhyme-warn：浅黄底 + 金框警告）── */
.t-rhyme-err {
  color: var(--ink);
  background: #fef8ee;
  box-shadow: 0 0 0 2px var(--warning);
}

/* ── 出韵/未收录韵脚（红色标记，最高优先）── */
.t-rhyme-out {
  color: var(--error-text);
  background: var(--error-bg);
  box-shadow: 0 0 0 2px var(--error-text);
  border-radius: 2px;
  font-weight: 700;
  text-decoration: underline wavy var(--error-underline);
  text-underline-offset: 3px;
}

/* ── 出律（红色波浪线）── */
.t-err {
  color: var(--error-text);
  text-decoration: underline wavy var(--error-underline);
  text-underline-offset: 5px;
}

/* ── 多音字（紫色虚线）── */
.t-multi {
  color: var(--multi-text);
  background: var(--multi-bg);
  border-radius: 2px;
  border: 1px dashed var(--multi-border);
  cursor: pointer;
}
.t-multi:hover { background: #e8e0f0; }

/* ── 未收录 ── */
.t-unk {
  color: var(--ink-muted);
  font-style: italic;
}

/* ── 标点/空格 ── */
.t-skip { color: var(--ink-muted); }

/* ── 光标 ── */
.cursor {
  outline: 1px dashed var(--accent);
  outline-offset: -1px;
}

/* ── 移动端适配（字号行高须与 EditorTextarea 完全同步）── */
@media (max-width: 640px) {
  .highlight-layer {
    font-size: 16px;
    line-height: 1.875;
    padding: 8px 10px;
  }
  .hl-line { min-height: 30px; }
}
</style>
