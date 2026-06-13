<template>
  <div class="editor-page">
    <!-- 顶栏 -->
    <header class="editor-topbar">
      <router-link :to="{ name: 'CipaiList' }" class="btn-back">← 返回列表</router-link>
      <h1>{{ isEdit ? '编辑词牌' : '新建词牌' }}</h1>
      <button class="btn-save" :disabled="saving" @click="handleSubmit">
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </header>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-banner">{{ errorMsg }}</div>

    <div class="editor-layout">
      <!-- 左侧：基本信息 -->
      <div class="editor-left">
        <!-- 基本信息卡片 -->
        <section class="form-card">
          <h2>基本信息</h2>

          <div class="form-group">
            <label>词牌 ID <span class="required">*</span></label>
            <input
              v-model="form.id"
              placeholder="如 manjianghong（字母开头，字母数字下划线连字符）"
              :disabled="isEdit"
            />
            <span class="form-hint">创建后不可修改</span>
          </div>

          <div class="form-group">
            <label>词牌名 <span class="required">*</span></label>
            <input v-model="form.name" placeholder="如 满江红" />
          </div>

          <div class="form-group">
            <label>别名</label>
            <input
              v-model="aliasInput"
              placeholder="多个别名用逗号分隔，如 满江红慢,上江虹"
            />
          </div>

          <div class="form-group">
            <label>备注</label>
            <textarea
              v-model="form.notes"
              placeholder="如：双调九十三字，前片八句四仄韵，后片十句五仄韵"
              rows="3"
            ></textarea>
          </div>

          <div class="form-stats">
            总字数：<strong>{{ totalChars }}</strong> ·
            句数：<strong>{{ form.sentences.length }}</strong> ·
            押韵句：<strong>{{ rhymeCount }}</strong>
          </div>
        </section>
      </div>

      <!-- 右侧：格子编辑器 + 预览 -->
      <div class="editor-right">
        <PatternGrid v-model="form.sentences" />
        <PreviewPane :sentences="form.sentences" class="preview-section" />
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
  id: '',
  name: '',
  alias: [],
  charCount: 0,
  sentences: [
    {
      index: 0,
      length: 5,
      pattern: ['平', '仄', '可平可仄', '平', '仄'],
      isRhyme: true,
      rhymeType: '平韵'
    },
    {
      index: 1,
      length: 5,
      pattern: ['仄', '仄', '平', '平', '仄'],
      isRhyme: true,
      rhymeType: '平韵'
    }
  ],
  notes: ''
})

const aliasInput = ref('')
const saving = ref(false)
const errorMsg = ref('')

// 别名输入同步
watch(aliasInput, (val) => {
  form.alias = val.split(',').map(s => s.trim()).filter(Boolean)
})

// 总字数
const totalChars = computed(() =>
  form.sentences.reduce((sum, s) => sum + s.pattern.length, 0)
)

// 押韵句数
const rhymeCount = computed(() =>
  form.sentences.filter(s => s.isRhyme).length
)

// 自动同步 charCount
watch(totalChars, (val) => {
  form.charCount = val
})

// 加载词牌数据（编辑模式）
onMounted(async () => {
  if (isEdit.value) {
    try {
      const cipai = await fetchCipai(route.params.id)
      form.id = cipai.id
      form.name = cipai.name
      form.alias = cipai.alias || []
      form.charCount = cipai.charCount
      form.sentences = cipai.sentences || []
      form.notes = cipai.notes || ''
      aliasInput.value = (cipai.alias || []).join(', ')
    } catch (err) {
      errorMsg.value = '加载词牌数据失败：' + (err.response?.data?.message || err.message)
    }
  }
})

// 提交
async function handleSubmit() {
  // 前端基本校验
  errorMsg.value = ''

  if (!form.id || !/^[a-z][a-z0-9_-]*$/i.test(form.id)) {
    errorMsg.value = '词牌 ID 格式不正确（字母开头，仅含字母数字下划线连字符）'
    return
  }
  if (!form.name.trim()) {
    errorMsg.value = '词牌名不能为空'
    return
  }
  if (form.sentences.length === 0) {
    errorMsg.value = '至少需要一句格律定义'
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form,
      charCount: totalChars.value
    }

    if (isEdit.value) {
      await updateCipai(route.params.id, payload)
    } else {
      await createCipai(payload)
    }

    router.push({ name: 'CipaiList' })
  } catch (err) {
    const data = err.response?.data
    if (data?.errors) {
      errorMsg.value = data.message + '：' + data.errors.join('；')
    } else {
      errorMsg.value = '保存失败：' + (data?.message || err.message)
    }
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.editor-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

/* 顶栏 */
.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
}

.editor-topbar h1 {
  font-size: 24px;
  color: var(--accent);
}

.btn-back {
  color: var(--text-muted);
  font-size: 14px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.btn-back:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.btn-save {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  padding: 10px 32px;
  font-size: 15px;
}

.btn-save:hover:not(:disabled) {
  background: #a0522d;
}

.btn-save:disabled {
  opacity: 0.6;
}

/* 错误提示 */
.error-banner {
  background: #fef0f0;
  color: var(--danger);
  border: 1px solid #f5c6cb;
  border-radius: var(--radius);
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 14px;
}

/* 双栏布局 */
.editor-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 860px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

.editor-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-section {
  /* 在格子编辑器下方 */
}

/* 表单卡片 */
.form-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 24px;
}

.form-card h2 {
  font-size: 18px;
  color: var(--accent);
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.required {
  color: var(--danger);
}

.form-group input,
.form-group textarea {
  width: 100%;
}

.form-hint {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.form-stats {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px dashed var(--border);
  font-size: 13px;
  color: var(--text-muted);
}

.form-stats strong {
  color: var(--accent);
}
</style>
