<template>
  <div class="pattern-grid">
    <div class="grid-header">
      <h3>格律编辑器</h3>
      <div class="header-right">
        <label class="shuangdiao-toggle">
          <input type="checkbox" v-model="shuangdiao" @change="onToggleShuangdiao" />
          双调
        </label>
        <div class="legend">
          <span class="leg-item"><span class="dot ping"></span> 平</span>
          <span class="leg-item"><span class="dot ze"></span> 仄</span>
          <span class="leg-item"><span class="dot ke"></span> 可平可仄</span>
          <span class="leg-item"><span class="dot yun"></span> 韵脚</span>
          <span class="leg-hint">点击格子切换</span>
        </div>
      </div>
    </div>

    <template v-if="!shuangdiao">
      <div class="sentences">
        <div v-for="(sentence, si) in modelValue" :key="si" class="sentence-row">
          <span class="row-label">{{ si + 1 }}</span>
          <span
            v-for="(tone, ci) in sentence.pattern" :key="ci"
            class="cell" :class="cellClass(tone)"
            @click="cycleTone(si, ci)"
          >{{ cellLabel(tone) }}</span>
          <div class="rhyme-info">
            <label class="rhyme-check">
              <input type="checkbox" :checked="sentence.isRhyme" @change="toggleRhyme(si)" /> 押韵
            </label>
            <select v-if="sentence.isRhyme" :value="sentence.rhymeType || '仄韵'" @change="setRhymeType(si, $event.target.value)" class="rhyme-select">
              <option value="平韵">平韵</option>
              <option value="仄韵">仄韵</option>
              <option value="可平可仄">可平可仄</option>
            </select>
          </div>
          <div class="row-actions">
            <button class="btn-icon" title="删除此句" @click="removeSentence(si)">✕</button>
          </div>
        </div>
      </div>
      <div class="add-row">
        <button class="btn-add-sentence" @click="addSentence">+ 添加一句</button>
        <input v-model.number="newSentenceLength" type="number" min="1" max="20" class="input-length" />
        <span class="hint">字</span>
      </div>
    </template>

    <template v-else>
      <div class="section-header">上片</div>
      <div class="sentences">
        <div v-for="(sentence, si) in shangPian" :key="'s'+si" class="sentence-row">
          <span class="row-label">{{ si + 1 }}</span>
          <span v-for="(tone, ci) in sentence.pattern" :key="ci" class="cell" :class="cellClass(tone)" @click="cycleTone(si, ci)">{{ cellLabel(tone) }}</span>
          <div class="rhyme-info">
            <label class="rhyme-check"><input type="checkbox" :checked="sentence.isRhyme" @change="toggleRhyme(si)" /> 押韵</label>
            <select v-if="sentence.isRhyme" :value="sentence.rhymeType || '仄韵'" @change="setRhymeType(si, $event.target.value)" class="rhyme-select">
              <option value="平韵">平韵</option>
              <option value="仄韵">仄韵</option>
              <option value="可平可仄">可平可仄</option>
            </select>
          </div>
          <div class="row-actions">
            <button class="btn-icon" title="删除此句" @click="removeShangSentence(si)">✕</button>
          </div>
        </div>
      </div>
      <div class="add-row">
        <button class="btn-add-sentence" @click="addShangSentence">+ 添加上片句</button>
        <input v-model.number="newSentenceLength" type="number" min="1" max="20" class="input-length" />
        <span class="hint">字</span>
      </div>

      <div class="section-header">下片</div>
      <div class="sentences">
        <div v-for="(sentence, si) in xiaPian" :key="'x'+si" class="sentence-row" :class="{ 'row-independent': xiaIndependents.has(shangCount + si) }">
          <span class="row-label">{{ si + 1 }}</span>
          <span v-for="(tone, ci) in sentence.pattern" :key="ci" class="cell" :class="cellClass(tone)" @click="cycleTone(shangCount + si, ci)">{{ cellLabel(tone) }}</span>
          <div class="rhyme-info">
            <label class="rhyme-check"><input type="checkbox" :checked="sentence.isRhyme" @change="toggleRhyme(shangCount + si)" /> 押韵</label>
            <select v-if="sentence.isRhyme" :value="sentence.rhymeType || '仄韵'" @change="setRhymeType(shangCount + si, $event.target.value)" class="rhyme-select">
              <option value="平韵">平韵</option>
              <option value="仄韵">仄韵</option>
              <option value="可平可仄">可平可仄</option>
            </select>
          </div>
          <div v-if="xiaIndependents.has(shangCount + si)" class="ind-badge">独立</div>
          <div class="row-actions">
            <button class="btn-icon" title="删除此句" @click="removeXiaSentence(si)">✕</button>
          </div>
        </div>
      </div>
      <div class="add-row">
        <button class="btn-add-sentence" @click="addXiaSentence">+ 添加下片句</button>
        <input v-model.number="newSentenceLength2" type="number" min="1" max="20" class="input-length" />
        <span class="hint">字</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'

const props = defineProps({ modelValue: { type: Array, required: true } })
const emit = defineEmits(['update:modelValue'])

const shuangdiao = ref(false)
const xiaIndependents = reactive(new Set())
const shangCount = ref(props.modelValue.length)
const shangPian = computed(() => props.modelValue.slice(0, shangCount.value))
const xiaPian = computed(() => props.modelValue.slice(shangCount.value))

const TONE_CYCLE = ['平', '仄', '可平可仄', '韵脚']

function cellClass(tone) {
  return { 't-ping': tone === '平', 't-ze': tone === '仄', 't-ke': tone === '可平可仄', 't-yun': tone === '韵脚' }
}
function cellLabel(tone) {
  const map = { '平': '平', '仄': '仄', '可平可仄': '中', '韵脚': '韵' }
  return map[tone] || tone
}
function cloneSentence(s) { return { ...s, pattern: [...s.pattern] } }

function applyChange(si, updater) {
  let sentences = props.modelValue.map((s, i) => {
    if (i === si) return updater(s)
    return { ...s, pattern: [...s.pattern] }
  })
  if (shuangdiao.value && si < shangCount.value) {
    const xiaIdx = shangCount.value + si
    if (xiaIdx < sentences.length && !xiaIndependents.has(xiaIdx)) sentences[xiaIdx] = updater(sentences[xiaIdx])
  }
  if (shuangdiao.value && si >= shangCount.value) xiaIndependents.add(si)
  emit('update:modelValue', sentences)
}

function cycleTone(si, ci) {
  applyChange(si, (s) => {
    const p = [...s.pattern]
    p[ci] = TONE_CYCLE[(TONE_CYCLE.indexOf(p[ci]) + 1) % TONE_CYCLE.length]
    return { ...s, pattern: p }
  })
}
function toggleRhyme(si) {
  applyChange(si, (s) => ({ ...s, pattern: [...s.pattern], isRhyme: !s.isRhyme, rhymeType: !s.isRhyme ? (s.rhymeType || '仄韵') : null }))
}
function setRhymeType(si, value) {
  applyChange(si, (s) => ({ ...s, pattern: [...s.pattern], rhymeType: value }))
}

const newSentenceLength = ref(5)
const newSentenceLength2 = ref(5)
function makeSentence(idx, len) { return { index: idx, length: len, pattern: Array(len).fill('平'), isRhyme: false, rhymeType: null } }
function clampLen() { return Math.max(1, Math.min(20, newSentenceLength.value || 5)) }
function clampLen2() { return Math.max(1, Math.min(20, newSentenceLength2.value || 5)) }

function addSentence() {
  const sentences = [...props.modelValue]; sentences.push(makeSentence(sentences.length, clampLen()))
  emit('update:modelValue', sentences)
}
function removeSentence(si) {
  if (props.modelValue.length <= 1) return
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== si).map((s, i) => ({ ...s, index: i, pattern: [...s.pattern] })))
}

function addShangSentence() {
  const len = clampLen(); const sentences = props.modelValue.map(s => cloneSentence(s))
  const idx = shangCount.value
  sentences.splice(idx, 0, makeSentence(idx, len))
  const xiaInsertAt = idx + 1 + xiaPian.value.length
  sentences.splice(xiaInsertAt, 0, makeSentence(xiaInsertAt, len))
  sentences.forEach((s, i) => { s.index = i }); shangCount.value++
  emit('update:modelValue', sentences)
}
function removeShangSentence(si) {
  if (shangPian.value.length <= 1) return
  const sentences = props.modelValue.map(s => cloneSentence(s))
  const xiaIdx = shangCount.value + si
  if (xiaIdx < sentences.length) {
    sentences.splice(xiaIdx, 1); xiaIndependents.delete(xiaIdx)
    const ni = new Set(); xiaIndependents.forEach(v => ni.add(v > xiaIdx ? v - 1 : v))
    xiaIndependents.clear(); ni.forEach(v => xiaIndependents.add(v))
  }
  sentences.splice(si, 1); sentences.forEach((s, i) => { s.index = i }); shangCount.value--
  emit('update:modelValue', sentences)
}
function addXiaSentence() {
  const sentences = props.modelValue.map(s => cloneSentence(s))
  const idx = sentences.length; sentences.push(makeSentence(idx, clampLen2())); xiaIndependents.add(idx)
  emit('update:modelValue', sentences)
}
function removeXiaSentence(si) {
  if (xiaPian.value.length <= 1) return
  const gi = shangCount.value + si
  const sentences = props.modelValue.filter((_, i) => i !== gi).map((s, i) => ({ ...s, index: i, pattern: [...s.pattern] }))
  xiaIndependents.delete(gi); const ni = new Set(); xiaIndependents.forEach(v => ni.add(v > gi ? v - 1 : v))
  xiaIndependents.clear(); ni.forEach(v => xiaIndependents.add(v))
  emit('update:modelValue', sentences)
}
function onToggleShuangdiao() {
  if (shuangdiao.value) {
    const existing = props.modelValue.map(s => cloneSentence(s)); shangCount.value = existing.length
    emit('update:modelValue', [...existing, ...existing.map((s, i) => { const c = cloneSentence(s); c.index = shangCount.value + i; return c })])
    xiaIndependents.clear()
  } else { xiaIndependents.clear(); shangCount.value = props.modelValue.length }
}
</script>

<style scoped>
.pattern-grid {
  background: var(--paper-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 20px;
}

.grid-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
  padding-bottom: 12px; border-bottom: 1px solid var(--border-light);
}
.grid-header h3 { font-size: 15px; color: var(--ink); font-weight: 600; }
.header-right { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }

.shuangdiao-toggle {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: var(--accent); font-weight: 500;
  cursor: pointer; padding: 4px 12px;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--paper-card); user-select: none;
}
.shuangdiao-toggle:has(input:checked) { background: var(--accent); color: #fff; border-color: var(--accent); }

.section-header {
  font-size: 14px; font-weight: 600; color: var(--accent);
  margin: 16px 0 8px; padding: 6px 14px;
  background: var(--accent-soft); border-left: 3px solid var(--accent);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.row-independent { border-left: 3px solid var(--accent); }
.ind-badge {
  font-size: 10px; background: var(--accent-soft); color: var(--accent);
  padding: 2px 8px; border-radius: 10px; white-space: nowrap;
}

.legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--ink-muted); align-items: center; }
.leg-item { display: flex; align-items: center; gap: 4px; }
.dot { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
.dot.ping { background: var(--ping-bg); border: 1px solid var(--ping-border); }
.dot.ze   { background: var(--ze-bg); border: 1px solid var(--ze-border); }
.dot.ke   { background: var(--ke-bg); border: 1px solid var(--ke-border); }
.dot.yun  { background: var(--yun-bg); border: 1px solid var(--yun-border); }
.leg-hint { color: var(--ink-muted); }

.sentences { display: flex; flex-direction: column; gap: 8px; }
.sentence-row {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 8px; background: var(--paper-warm); border-radius: var(--radius); flex-wrap: wrap;
}
.row-label {
  display: flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; font-size: 11px;
  color: var(--ink-muted); background: var(--accent-soft);
  border-radius: 50%; flex-shrink: 0;
}

.cell {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; border-radius: 4px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  user-select: none; transition: all 0.1s; border: 2px solid transparent;
}
.cell:hover { transform: scale(1.08); }

.t-ping { background: var(--ping-bg); border-color: var(--ping-border); color: var(--ping-text); }
.t-ze   { background: var(--ze-bg); border-color: var(--ze-border); color: var(--ze-text); }
.t-ke   { background: var(--ke-bg); border-color: var(--ke-border); color: var(--ke-text); }
.t-yun  { background: var(--yun-bg); border-color: var(--yun-border); color: var(--yun-text); box-shadow: 0 0 0 2px rgba(212,184,96,0.3); }

.rhyme-info { display: flex; align-items: center; gap: 6px; margin-left: 8px; font-size: 12px; color: var(--ink-muted); }
.rhyme-check { display: flex; align-items: center; gap: 4px; cursor: pointer; }
.rhyme-select { padding: 2px 6px; font-size: 11px; }

.row-actions { margin-left: auto; }
.btn-icon {
  width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
  background: transparent; color: var(--ink-muted); font-size: 13px;
  padding: 0; border-radius: 50%; transition: all 0.15s;
}
.btn-icon:hover { background: rgba(192,74,58,0.08); color: var(--danger); }

.add-row { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--border); }
.btn-add-sentence { background: var(--paper-warm); color: var(--accent); font-weight: 500; padding: 5px 14px; font-size: 13px; }
.btn-add-sentence:hover { background: var(--accent-soft); }
.hint { font-size: 11px; color: var(--ink-muted); }
.input-length { width: 52px; padding: 4px 6px; font-size: 12px; text-align: center; }
</style>
