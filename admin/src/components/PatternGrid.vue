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
          <span class="leg-hint">· 点击格子切换</span>
        </div>
      </div>
    </div>

    <!-- 非双调模式：平铺全部句子 -->
    <template v-if="!shuangdiao">
      <div class="sentences">
        <div
          v-for="(sentence, si) in modelValue"
          :key="si"
          class="sentence-row"
        >
          <span class="row-label">{{ si + 1 }}</span>
          <span
            v-for="(tone, ci) in sentence.pattern"
            :key="ci"
            class="cell"
            :class="cellClass(tone)"
            @click="cycleTone(si, ci)"
          >{{ cellLabel(tone) }}</span>
          <div class="rhyme-info">
            <label class="rhyme-check">
              <input type="checkbox" :checked="sentence.isRhyme" @change="toggleRhyme(si)" /> 押韵
            </label>
            <select v-if="sentence.isRhyme" :value="sentence.rhymeType || '仄韵'" @change="setRhymeType(si, ($event.target).value)" class="rhyme-select">
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
        <input v-model.number="newSentenceLength" type="number" min="1" max="20" class="input-length" title="新句字数" />
        <span class="hint">字</span>
      </div>
    </template>

    <!-- 双调模式：上片 / 下片 -->
    <template v-else>
      <!-- 上片 -->
      <div class="section-header">上片</div>
      <div class="sentences">
        <div v-for="(sentence, si) in shangPian" :key="'s'+si" class="sentence-row">
          <span class="row-label">{{ si + 1 }}</span>
          <span
            v-for="(tone, ci) in sentence.pattern"
            :key="ci"
            class="cell"
            :class="cellClass(tone)"
            @click="cycleTone(si, ci)"
          >{{ cellLabel(tone) }}</span>
          <div class="rhyme-info">
            <label class="rhyme-check">
              <input type="checkbox" :checked="sentence.isRhyme" @change="toggleRhyme(si)" /> 押韵
            </label>
            <select v-if="sentence.isRhyme" :value="sentence.rhymeType || '仄韵'" @change="setRhymeType(si, ($event.target).value)" class="rhyme-select">
              <option value="平韵">平韵</option>
              <option value="仄韵">仄韵</option>
              <option value="可平可仄">可平可仄</option>
            </select>
          </div>
          <div class="row-actions">
            <button class="btn-icon" title="删除此句（同步删除下片对应句）" @click="removeShangSentence(si)">✕</button>
          </div>
        </div>
      </div>
      <div class="add-row">
        <button class="btn-add-sentence" @click="addShangSentence">+ 添加上片句</button>
        <input v-model.number="newSentenceLength" type="number" min="1" max="20" class="input-length" title="新句字数" />
        <span class="hint">字</span>
      </div>

      <!-- 下片 -->
      <div class="section-header">下片</div>
      <div class="sentences">
        <div v-for="(sentence, si) in xiaPian" :key="'x'+si" class="sentence-row" :class="{ 'row-independent': xiaIndependents.has(shangCount + si) }">
          <span class="row-label">{{ si + 1 }}</span>
          <span
            v-for="(tone, ci) in sentence.pattern"
            :key="ci"
            class="cell"
            :class="cellClass(tone)"
            @click="cycleTone(shangCount + si, ci)"
          >{{ cellLabel(tone) }}</span>
          <div class="rhyme-info">
            <label class="rhyme-check">
              <input type="checkbox" :checked="sentence.isRhyme" @change="toggleRhyme(shangCount + si)" /> 押韵
            </label>
            <select v-if="sentence.isRhyme" :value="sentence.rhymeType || '仄韵'" @change="setRhymeType(shangCount + si, ($event.target).value)" class="rhyme-select">
              <option value="平韵">平韵</option>
              <option value="仄韵">仄韵</option>
              <option value="可平可仄">可平可仄</option>
            </select>
          </div>
          <div v-if="xiaIndependents.has(shangCount + si)" class="ind-badge" title="已独立修改，不再与上片同步">独立</div>
          <div class="row-actions">
            <button class="btn-icon" title="删除此句" @click="removeXiaSentence(si)">✕</button>
          </div>
        </div>
      </div>
      <div class="add-row">
        <button class="btn-add-sentence" @click="addXiaSentence">+ 添加下片句</button>
        <input v-model.number="newSentenceLength2" type="number" min="1" max="20" class="input-length" title="新句字数" />
        <span class="hint">字</span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

// ── 双调状态 ──
const shuangdiao = ref(false)
const xiaIndependents = reactive(new Set())  // 下片中已独立修改的句子的全局索引

// 上片句数 —— 必须为 ref，不能从 total 动态推算，否则增删下片句时分割点会漂移
const shangCount = ref(props.modelValue.length)

// 派生：上片 / 下片 数组
const shangPian = computed(() => props.modelValue.slice(0, shangCount.value))
const xiaPian = computed(() => props.modelValue.slice(shangCount.value))

// ── 格律取值循环顺序 ──
const TONE_CYCLE = ['平', '仄', '可平可仄', '韵脚']

function cellClass(tone) {
  return {
    'tone-ping': tone === '平',
    'tone-ze': tone === '仄',
    'tone-ke': tone === '可平可仄',
    'tone-yun': tone === '韵脚'
  }
}

function cellLabel(tone) {
  const map = { '平': '平', '仄': '仄', '可平可仄': '中', '韵脚': '韵' }
  return map[tone] || tone
}

// 深拷贝一句
function cloneSentence(s) {
  return { ...s, pattern: [...s.pattern] }
}

// ── 核心：修改句子（统一入口，处理双调同步） ──
function applyChange(si, updater) {
  let sentences = props.modelValue.map((s, i) => {
    if (i === si) return updater(s)
    return { ...s, pattern: [...s.pattern] }
  })

  // 双调同步：上片修改 → 自动同步到未独立的下片对应句
  if (shuangdiao.value && si < shangCount.value) {
    const xiaIdx = shangCount.value + si
    if (xiaIdx < sentences.length && !xiaIndependents.has(xiaIdx)) {
      sentences[xiaIdx] = updater(sentences[xiaIdx])
    }
  }

  // 下片修改 → 标记为独立
  if (shuangdiao.value && si >= shangCount.value) {
    xiaIndependents.add(si)
  }

  emit('update:modelValue', sentences)
}

// ── 格子 / 押韵 / 韵脚类型 ──
function cycleTone(si, ci) {
  applyChange(si, (s) => {
    const pattern = [...s.pattern]
    const idx = TONE_CYCLE.indexOf(pattern[ci])
    pattern[ci] = TONE_CYCLE[(idx + 1) % TONE_CYCLE.length]
    return { ...s, pattern }
  })
}

function toggleRhyme(si) {
  applyChange(si, (s) => ({
    ...s,
    pattern: [...s.pattern],
    isRhyme: !s.isRhyme,
    rhymeType: !s.isRhyme ? (s.rhymeType || '仄韵') : null
  }))
}

function setRhymeType(si, value) {
  applyChange(si, (s) => ({ ...s, pattern: [...s.pattern], rhymeType: value }))
}

// ── 新句字数 ──
const newSentenceLength = ref(5)
const newSentenceLength2 = ref(5)

function makeSentence(idx, len) {
  return {
    index: idx,
    length: len,
    pattern: Array(len).fill('平'),
    isRhyme: false,
    rhymeType: null
  }
}

function clampLen() {
  return Math.max(1, Math.min(20, newSentenceLength.value || 5))
}

function clampLen2() {
  return Math.max(1, Math.min(20, newSentenceLength2.value || 5))
}

// ── 非双调：添加 / 删除 ──
function addSentence() {
  const len = clampLen()
  const sentences = [...props.modelValue]
  sentences.push(makeSentence(sentences.length, len))
  emit('update:modelValue', sentences)
}

function removeSentence(si) {
  if (props.modelValue.length <= 1) return
  const sentences = props.modelValue
    .filter((_, i) => i !== si)
    .map((s, i) => ({ ...s, index: i, pattern: [...s.pattern] }))
  emit('update:modelValue', sentences)
}

// ── 双调：上片添加 / 删除 ──
function addShangSentence() {
  const len = clampLen()
  const sentences = props.modelValue.map(s => cloneSentence(s))
  const idx = shangCount.value
  // 在上片末尾插入
  sentences.splice(idx, 0, makeSentence(idx, len))
  // 同步向下片对应位置插入
  const xiaInsertAt = idx + 1 + (xiaPian.value.length)
  sentences.splice(xiaInsertAt, 0, makeSentence(xiaInsertAt, len))
  // 重排 index
  sentences.forEach((s, i) => { s.index = i })
  shangCount.value++
  emit('update:modelValue', sentences)
}

function removeShangSentence(si) {
  if (shangPian.value.length <= 1) return
  const sentences = props.modelValue.map(s => cloneSentence(s))
  const xiaIdx = shangCount.value + si
  // 先删下片对应句（若存在），再删上片句（从后往前删避免索引偏移）
  if (xiaIdx < sentences.length) {
    sentences.splice(xiaIdx, 1)
    // 清理独立标记
    xiaIndependents.delete(xiaIdx)
    // 偏移后的独立标记需要调整
    const newIndependents = new Set()
    xiaIndependents.forEach(v => {
      newIndependents.add(v > xiaIdx ? v - 1 : v)
    })
    xiaIndependents.clear()
    newIndependents.forEach(v => xiaIndependents.add(v))
  }
  sentences.splice(si, 1)
  sentences.forEach((s, i) => { s.index = i })
  shangCount.value--
  emit('update:modelValue', sentences)
}

// ── 双调：下片添加 / 删除 ──
function addXiaSentence() {
  const len = clampLen2()
  const sentences = props.modelValue.map(s => cloneSentence(s))
  const idx = sentences.length
  sentences.push(makeSentence(idx, len))
  // 独立添加的下片句自动标记为独立
  xiaIndependents.add(idx)
  emit('update:modelValue', sentences)
}

function removeXiaSentence(si) {
  if (xiaPian.value.length <= 1) return
  const globalIdx = shangCount.value + si
  const sentences = props.modelValue
    .filter((_, i) => i !== globalIdx)
    .map((s, i) => ({ ...s, index: i, pattern: [...s.pattern] }))
  // 清理独立标记
  xiaIndependents.delete(globalIdx)
  const newIndependents = new Set()
  xiaIndependents.forEach(v => {
    newIndependents.add(v > globalIdx ? v - 1 : v)
  })
  xiaIndependents.clear()
  newIndependents.forEach(v => xiaIndependents.add(v))
  emit('update:modelValue', sentences)
}

// ── 切换双调 ──
function onToggleShuangdiao() {
  if (shuangdiao.value) {
    // 开启双调：当前全部句子视为上片，复制一份作为下片
    const existing = props.modelValue.map(s => cloneSentence(s))
    shangCount.value = existing.length
    const xiaCopy = existing.map((s, i) => {
      const copy = cloneSentence(s)
      copy.index = shangCount.value + i
      return copy
    })
    xiaIndependents.clear()
    emit('update:modelValue', [...existing, ...xiaCopy])
  } else {
    // 关闭双调：保留下片独立修改过的句子
    xiaIndependents.clear()
    shangCount.value = props.modelValue.length
  }
}
</script>

<style scoped>
.pattern-grid {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
}

.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.grid-header h3 {
  font-size: 16px;
  color: var(--accent);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.shuangdiao-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
  padding: 4px 12px;
  border: 1px solid var(--accent-light);
  border-radius: var(--radius);
  background: #fdf6ec;
  user-select: none;
}

.shuangdiao-toggle input {
  cursor: pointer;
}

.shuangdiao-toggle:has(input:checked) {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

/* 上片 / 下片 区段标题 */
.section-header {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent);
  margin: 16px 0 8px;
  padding: 6px 14px;
  background: #fdf0e0;
  border-left: 4px solid var(--accent);
  border-radius: 0 6px 6px 0;
}

/* 独立修改过的下片行 */
.row-independent {
  border-left: 3px solid #e67e22;
}

.ind-badge {
  font-size: 11px;
  background: #fef0e0;
  color: #e67e22;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid #f0c080;
  white-space: nowrap;
}

.legend {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-muted);
  align-items: center;
}

.leg-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.1);
}

.dot.ping { background: #dceefb; border-color: #7faed4; }
.dot.ze   { background: #f5f5f5; border-color: #bbb; }
.dot.ke   { background: #e8f5e9; border-color: #81c784; }
.dot.yun  { background: #fff8e1; border-color: #ffb74d; }

.leg-hint {
  color: #bbb;
  font-style: italic;
}

/* 句子行 */
.sentences {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sentence-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: #fdfaf5;
  border-radius: 6px;
  flex-wrap: wrap;
}

.row-label {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  color: var(--text-muted);
  background: #f0e6d3;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 格子 */
.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all 0.12s;
  border: 2px solid transparent;
}

.cell:hover {
  transform: scale(1.08);
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.cell:active {
  transform: scale(1.0);
}

/* 各状态样式 */
.tone-ping {
  background: #dceefb;
  border-color: #90caf9;
  color: #1565c0;
}

.tone-ze {
  background: #f5f5f5;
  border-color: #ccc;
  color: #555;
}

.tone-ke {
  background: #e8f5e9;
  border-color: #a5d6a7;
  color: #2e7d32;
}

.tone-yun {
  background: #fff8e1;
  border-color: #ffb74d;
  color: #e65100;
  box-shadow: 0 0 0 2px rgba(255, 183, 77, 0.3);
}

/* 韵脚信息 */
.rhyme-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.rhyme-check {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.rhyme-check input {
  cursor: pointer;
}

.rhyme-select {
  padding: 2px 6px;
  font-size: 12px;
}

/* 行操作 */
.row-actions {
  margin-left: auto;
}

.btn-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: #ccc;
  font-size: 14px;
  padding: 0;
  border-radius: 50%;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: #fef0f0;
  color: var(--danger);
}

/* 添加行 */
.add-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
}

.btn-add-sentence {
  background: #f0e6d3;
  color: var(--accent);
  font-weight: 600;
  padding: 6px 16px;
  font-size: 14px;
}

.btn-add-sentence:hover {
  background: #e8d8bb;
}

.hint {
  font-size: 12px;
  color: #ccc;
}

.input-length {
  width: 56px;
  padding: 4px 6px;
  font-size: 13px;
  text-align: center;
}
</style>
