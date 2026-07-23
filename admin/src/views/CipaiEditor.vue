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
        <PatternGrid v-model="form.sentences" />
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
      form.charCount = cipai.charCount; form.sentences = cipai.sentences || []
      form.notes = cipai.notes || ''
      aliasInput.value = (cipai.alias || []).join(', ')
    } catch (err) { errorMsg.value = '加载词牌数据失败：' + (err.response?.data?.message || err.message) }
  }
})

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.id || !/^[a-z][a-z0-9_-]*$/i.test(form.id)) { errorMsg.value = '词牌 ID 格式不正确'; return }
  if (!form.name.trim()) { errorMsg.value = '词牌名不能为空'; return }
  if (form.sentences.length === 0) { errorMsg.value = '至少需要一句格律定义'; return }

  saving.value = true
  try {
    const payload = { ...form, charCount: totalChars.value }
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
