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
const props = defineProps({
  lines: { type: Array, default: () => [''] },
  matchResults: { type: Array, default: () => [] },
  activeLine: { type: Number, default: 0 },
  activeCol: { type: Number, default: 0 }
})

const emit = defineEmits(['char-hover', 'char-click'])

function getResult(li, ci) {
  if (!props.matchResults[li]) return null
  return props.matchResults[li][ci] || null
}

function charClass(li, ci) {
  const r = getResult(li, ci)
  if (!r) return ''
  const cls = []

  switch (r.status) {
    case 'ok':
      cls.push(r.actual === '平' ? 't-ping' : 't-ze')
      break
    case 'ok-rhyme':
      // 韵脚正确：底色按实际声调（平韵/仄韵均可成立）
      cls.push(r.actual === '平' ? 't-ping' : 't-ze', 't-rhyme')
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

/* ── 韵脚正确（蓝底金框）── */
.t-rhyme {
  box-shadow: 0 0 0 2px var(--rhyme-border);
}

/* ── 韵脚错误 ── */
.t-rhyme-err {
  color: var(--ink);
  background: #fef8ee;
  box-shadow: 0 0 0 2px var(--warning);
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
</style>
