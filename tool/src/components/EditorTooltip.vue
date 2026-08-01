<template>
  <Teleport to="body">
    <div v-if="visible" class="editor-tooltip" :style="tooltipStyle">
      <template v-if="error">
        <div class="et-header">
          <span class="et-char-big">{{ error.char }}</span>
          <span v-if="error.status === 'tone-error'" class="et-badge et-badge-err">出律</span>
          <span v-else-if="error.status === 'rhyme-warn'" class="et-badge et-badge-warn">韵误</span>
          <span v-else-if="error.status === 'multi-tone'" class="et-badge et-badge-multi">多音</span>
        </div>
        <div class="et-body">
          <template v-if="error.status === 'tone-error'">
            <div>实际 <strong>{{ toneLabel(error.actual) }}</strong> · 期望 <strong>{{ toneLabel(error.expected) }}</strong></div>
          </template>
          <template v-else-if="error.status === 'rhyme-warn'">
            <div>此字不在韵部「{{ error.rhymeGroup }}」中</div>
          </template>
          <template v-else-if="error.status === 'multi-tone'">
            <div>多音字，请根据上下文判断</div>
          </template>
        </div>
      </template>

      <template v-if="multiToneCandidates?.length">
        <div class="et-divider" v-if="error"></div>
        <div class="et-candidates">
          <div class="et-sub-title">候选读音（点击应用）</div>
          <button
            v-for="(c, i) in multiToneCandidates"
            :key="i"
            class="et-candidate"
            type="button"
            @click="selectCandidate(c)"
          >
            <span class="etc-reading">{{ c.reading }}</span>
            <span class="etc-tone" :class="c.tone === '平' ? 'etc-ping' : 'etc-ze'">{{ c.tone }}</span>
            <span class="etc-meaning">{{ c.meaning }}</span>
            <span v-if="suggestedTone === c.tone" class="etc-suggest">推荐</span>
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  error: { type: Object, default: null },
  position: { type: Object, default: () => ({ x: 0, y: 0 }) },
  multiToneCandidates: { type: Array, default: null },
  suggestedTone: { type: String, default: null }
})

const emit = defineEmits(['select'])

const visible = computed(() => !!props.error)

const tooltipStyle = computed(() => {
  const offset = 14
  const vw = typeof window !== 'undefined' ? window.innerWidth : 9999
  // 防溢出：右边缘留 12px 安全边距
  const left = Math.min(props.position.x + offset, Math.max(12, vw - 272))
  return {
    left: `${left}px`,
    top: `${props.position.y - 8}px`
  }
})

function toneLabel(t) {
  const map = { '平': '平声', '仄': '仄声', '多音': '多音字' }
  return map[t] || t || '未知'
}

function selectCandidate(candidate) {
  if (!props.error) return
  emit('select', {
    line: props.error.line,
    col: props.error.col,
    char: props.error.char,
    candidate
  })
}
</script>

<style scoped>
.editor-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: auto;
  background: var(--ink);
  color: #f0ebe0;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 13px;
  max-width: 260px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.18);
  line-height: 1.7;
  font-family: 'Noto Serif SC', 'SimSun', serif;
}

.et-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.et-char-big { font-size: 26px; font-weight: 700; color: #fff; }

.et-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 600;
}
.et-badge-err { background: var(--danger); color: #fff; }
.et-badge-warn { background: var(--warning); color: #fff; }
.et-badge-multi { background: var(--multi-text); color: #fff; }

.et-body { font-size: 12px; color: #c4b8a8; }
.et-body strong { color: #fff; }

.et-divider { height: 1px; background: rgba(255,255,255,0.12); margin: 8px 0; }

.et-sub-title { font-size: 11px; color: #8b7e6a; margin-bottom: 4px; }

.et-candidate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  font-size: 12px;
  width: 100%;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}
.et-candidate:hover { background: rgba(255,255,255,0.08); }
.etc-suggest {
  margin-left: auto;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--rhyme-border);
  color: #fff;
  flex-shrink: 0;
}
.etc-reading { font-weight: 600; color: #fff; min-width: 48px; }
.etc-tone { font-size: 10px; padding: 1px 6px; border-radius: 6px; font-weight: 600; }
.etc-ping { background: var(--ping-text); color: #fff; }
.etc-ze { background: #666; color: #fff; }
.etc-meaning { color: #a09080; font-size: 11px; }
/* ── 移动端适配 ── */
@media (max-width: 640px) {
  .editor-tooltip { max-width: min(80vw, 260px); }
}
</style>
