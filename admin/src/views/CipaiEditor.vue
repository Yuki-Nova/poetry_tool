<template>
  <div class="editor-page">
    <header class="editor-topbar">
      <router-link :to="{ name: 'CipaiList' }" class="btn-back">← 返回列表</router-link>
      <h1>{{ isEdit ? '编辑词牌' : '新建词牌' }}</h1>
      <button class="btn-save" :disabled="saving" @click="handleSubmit">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </header>

    <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

    <div class="editor-layout">
      <div class="editor-left">
        <section class="form-card">
          <h2>基本信息</h2>

          <div class="form-group">
            <label>词牌 ID <span class="required">*</span></label>
            <input v-model="form.id" placeholder="如 manjianghong（字母开头，字母数字下划线连字符）" :disabled="isEdit" />
            <span class="form-hint">创建后不可修改</span>
          </div>
          <div class="form-group">
            <label>词牌名 <span class="required">*</span></label>
            <input v-model="form.name" placeholder="如 满江红" />
          </div>
          <div class="form-group">
            <label>别名</label>
            <input v-model="aliasInput" placeholder="多个别名用逗号分隔，如 满江红慢,上江虹" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <textarea v-model="form.notes" placeholder="如：双调九十三字，前片八句四仄韵，后片十句五仄韵" rows="3"></textarea>
          </div>

          <div class="form-stats">
            总字数：<strong>{{ totalChars }}</strong> &middot;
            句数：<strong>{{ form.sentences.length }}</strong> &middot;
            押韵句：<strong>{{ rhymeCount }}</strong>
          </div>
        </section>
      </div>

      <div class="editor-right">
        <!-- 多格式变体管理 -->
        <section class="form-card">
          <div class="fmt-header">
            <h2>格式管理</h2>
            <button class="btn-add-fmt" @click="addFormat" :disabled="formatCount >= 8">+ 添加格式</button>
          </div>
          <div v-if="formats.length" class="fmt-list">
            <div
              v-for="(f, fi) in formats"
              :key="fi"
              class="fmt-item"
              :class="{ active: fi === currentFmt }"
              @click="selectFormat(fi)"
            >
              <input
                v-model="f.label"
                class="fmt-label-input"
                placeholder="格式名（如 定格 / 双调 / 变格）"
                @click.stop
                @change="syncLabelToMain(fi)"
              />
              <button
                v-if="formats.length > 1"
                class="fmt-del"
                title="删除此格式"
                @click.stop="removeFormat(fi)"
              >✕</button>
            </div>
          </div>
          <p v-if="formats.length === 0" class="fmt-empty">暂无格式，点击上方按钮添加</p>
          <p class="fmt-hint">提示：每个格式一套独立格律；保存时主格式（第一项）自动同步为词牌总格律。</p>
        </section>

        <PatternGrid v-model="form.sentences" :key="gridKey" />
        <PreviewPane :sentences="form.sentences" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchCipai, createCipai, updateCipai } from '../api/cipai'
import PatternGrid from '../components/PatternGrid.vue'
import PreviewPane from '../components/PreviewPane.vue'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)

const form = reactive({
  id: '', name: '', alias: [], charCount: 0,
  sentences: [
    { index: 0, length: 5, pattern: ['平','仄','可平可仄','平','仄'], isRhyme: true, rhymeType: '平韵' },
    { index: 1, length: 5, pattern: ['仄','仄','平','平','仄'], isRhyme: true, rhymeType: '平韵' }
  ],
  notes: ''
})

// ── 多格式变体管理 ──
// formats: [{ label, planSegments?, sentences }]；form.sentences 始终 = 当前编辑格式的 sentences
const formats = ref([])
const currentFmt = ref(0)
// PatternGrid 内部有双调状态，切换格式时用 key 强制重建，避免分片视图残留
const gridKey = ref(0)

const formatCount = computed(() => formats.value.length)

/** 保存当前编辑内容到 formats[currentFmt]，再加载目标格式的 sentences */
function selectFormat(fi) {
  if (fi === currentFmt.value) return
  if (!formats.value[currentFmt.value]) return
  // 1. 回写当前格式
  formats.value[currentFmt.value].sentences = form.sentences
  // 2. 切换 & 加载
  currentFmt.value = fi
  form.sentences = formats.value[fi].sentences || []
  gridKey.value++
}

/** 添加新格式（复制主格式内容作为起点） */
function addFormat() {
  const base = formats.value[currentFmt.value] || { sentences: form.sentences }
  const newFmt = {
    label: `变格${formats.value.length + 1}`,
    planSegments: base.planSegments || 1,
    sentences: JSON.parse(JSON.stringify(base.sentences || form.sentences))
  }
  formats.value.push(newFmt)
  // 自动切换到新格式
  selectFormat(formats.value.length - 1)
}

/** 删除格式（保留至少 1 个；删除的是当前格式则切到主格式） */
function removeFormat(fi) {
  if (formats.value.length <= 1) return
  formats.value.splice(fi, 1)
  if (fi < currentFmt.value) {
    currentFmt.value--
  } else if (fi === currentFmt.value) {
    currentFmt.value = Math.max(0, currentFmt.value - 1)
    form.sentences = formats.value[currentFmt.value]?.sentences || []
    gridKey.value++
  }
}

/** 格式 label 修改后同步主格式（formats[0]）到顶层 sentences 的注释保留 */
function syncLabelToMain() {
  // label 直接 v-model 到 formats[i].label，无需额外同步
  // 保持顶层 sentences = formats[0].sentences 在保存时处理
  if (formats.value[0] && currentFmt.value === 0) {
    form.sentences = formats.value[0].sentences || form.sentences
  }
}

/** 从后端词牌对象加载 formats 到编辑表单 */
function loadFormats(cipai) {
  if (Array.isArray(cipai.formats) && cipai.formats.length > 0) {
    formats.value = JSON.parse(JSON.stringify(cipai.formats))
    currentFmt.value = 0
    form.sentences = formats.value[0].sentences || cipai.sentences || []
    return
  }
  // 老数据无 formats：用顶层 sentences 构建单格式
  formats.value = [{
    label: '定格',
    planSegments: 1,
    sentences: (cipai.sentences || []).map(s => ({ ...s, pattern: [...(s.pattern || [])] }))
  }]
  currentFmt.value = 0
}

const aliasInput = ref('')
const saving = ref(false)
const errorMsg = ref('')

watch(aliasInput, (val) => { form.alias = val.split(',').map(s => s.trim()).filter(Boolean) })

const totalChars = computed(() => form.sentences.reduce((sum, s) => sum + s.pattern.length, 0))
const rhymeCount = computed(() => form.sentences.filter(s => s.isRhyme).length)
watch(totalChars, (val) => { form.charCount = val })

onMounted(async () => {
  if (isEdit.value) {
    try {
      const cipai = await fetchCipai(route.params.id)
      form.id = cipai.id; form.name = cipai.name; form.alias = cipai.alias || []
      form.charCount = cipai.charCount; form.notes = cipai.notes || ''
      loadFormats(cipai)
      aliasInput.value = (cipai.alias || []).join(', ')
    } catch (err) { errorMsg.value = '加载词牌数据失败：' + (err.response?.data?.message || err.message) }
  } else {
    // 新建：初始单格式「定格」
    formats.value = [{
      label: '定格',
      planSegments: 1,
      sentences: JSON.parse(JSON.stringify(form.sentences))
    }]
    currentFmt.value = 0
  }
})

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.id || !/^[a-z][a-z0-9_-]*$/i.test(form.id)) { errorMsg.value = '词牌 ID 格式不正确'; return }
  if (!form.name.trim()) { errorMsg.value = '词牌名不能为空'; return }
  if (form.sentences.length === 0) { errorMsg.value = '至少需要一句格律定义'; return }
  if (formats.value.length === 0) { errorMsg.value = '至少需要一个格式定义'; return }

  // 回写当前编辑格式 → 主格式同步顶层 sentences（满足 schema 一致性校验）
  if (formats.value[currentFmt.value]) {
    formats.value[currentFmt.value].sentences = JSON.parse(JSON.stringify(form.sentences))
  }
  const mainSentences = formats.value[0].sentences || form.sentences

  const payload = {
    ...form,
    charCount: mainSentences.reduce((sum, s) => sum + s.pattern.length, 0),
    sentences: mainSentences,
    formats: formats.value
  }

  saving.value = true
  try {
    isEdit.value ? await updateCipai(route.params.id, payload) : await createCipai(payload)
    router.push({ name: 'CipaiList' })
  } catch (err) {
    const data = err.response?.data
    errorMsg.value = data?.errors
      ? data.message + '：' + data.errors.join('；')
      : '保存失败：' + (data?.message || err.message)
  } finally { saving.value = false }
}
</script>

<style scoped>
.editor-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.editor-topbar h1 {
  font-size: 22px;
  font-weight: 500;
  color: var(--ink);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif;
}

.btn-back {
  color: var(--ink-muted);
  font-size: 13px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.btn-back:hover { color: var(--accent); border-color: var(--accent); }

.btn-save {
  background: var(--accent);
  color: #fff;
  font-weight: 500;
  padding: 9px 30px;
  font-size: 14px;
}
.btn-save:hover:not(:disabled) { background: var(--accent-hover); }
.btn-save:disabled { opacity: 0.6; }

.error-banner {
  background: rgba(192,74,58,0.06);
  color: var(--danger);
  border: 1px solid rgba(192,74,58,0.2);
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 13px;
}

.editor-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  align-items: start;
}
@media (max-width: 860px) { .editor-layout { grid-template-columns: 1fr; } }

.editor-right { display: flex; flex-direction: column; gap: 16px; }

/* ── 格式管理 ── */
.fmt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.fmt-header h2 { margin: 0; }
.btn-add-fmt {
  background: var(--accent-soft, rgba(61,90,128,0.08));
  color: var(--accent);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 5px 14px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-add-fmt:hover:not(:disabled) { background: var(--accent); color: #fff; }
.btn-add-fmt:disabled { opacity: 0.5; cursor: not-allowed; }
.fmt-list { display: flex; flex-wrap: wrap; gap: 8px; }
.fmt-item {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 3px 6px 3px 10px;
  background: var(--paper-card);
  cursor: pointer;
  transition: all 0.15s;
}
.fmt-item.active {
  border-color: var(--accent);
  background: var(--accent-soft);
  box-shadow: 0 0 0 1px var(--accent);
}
.fmt-label-input {
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--ink);
  width: 88px;
  padding: 2px 0;
  outline: none;
}
.fmt-del {
  border: none;
  background: transparent;
  color: var(--ink-muted);
  font-size: 11px;
  width: 20px; height: 20px;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.fmt-del:hover { background: rgba(192,74,58,0.1); color: var(--danger); }
.fmt-empty { font-size: 12px; color: var(--ink-muted); margin: 4px 0; }
.fmt-hint { font-size: 11px; color: var(--ink-muted); margin: 8px 0 0; }

.form-card {
  background: var(--paper-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius);
  padding: 24px;
}
.form-card h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
}

.form-group { margin-bottom: 16px; }
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.required { color: var(--danger); }
.form-group input, .form-group textarea { width: 100%; }

.form-hint {
  display: block;
  font-size: 11px;
  color: var(--ink-muted);
  margin-top: 4px;
}

.form-stats {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--ink-muted);
}
.form-stats strong { color: var(--accent); }
</style>
