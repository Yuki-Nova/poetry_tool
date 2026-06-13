<template>
  <div class="list-page">
    <!-- 顶部导航 -->
    <header class="topbar">
      <h1>📜 词牌管理</h1>
      <div class="topbar-actions">
        <router-link :to="{ name: 'CipaiEditor' }" class="btn-add">+ 新建词牌</router-link>
        <button class="btn-logout" @click="handleLogout">登出</button>
      </div>
    </header>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <input
        v-model="search"
        placeholder="搜索词牌名 / id / 别名..."
        @input="onSearch"
      />
      <span class="count">共 {{ filteredList.length }} 个词牌</span>
    </div>

    <!-- 词牌卡片列表 -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="filteredList.length === 0" class="empty">
      暂无词牌，<router-link :to="{ name: 'CipaiEditor' }">点击创建</router-link>
    </div>
    <div v-else class="card-grid">
      <div
        v-for="cipai in filteredList"
        :key="cipai.id"
        class="card"
      >
        <div class="card-body">
          <h2 class="card-title">{{ cipai.name }}</h2>
          <div class="card-meta">
            <span class="badge">{{ cipai.charCount }} 字</span>
            <span class="badge">{{ cipai.sentences.length }} 句</span>
            <span v-if="cipai.alias?.length" class="alias">又名：{{ cipai.alias.join('、') }}</span>
          </div>
          <p v-if="cipai.notes" class="card-notes">{{ cipai.notes }}</p>
        </div>
        <div class="card-actions">
          <router-link :to="{ name: 'CipaiEditor', params: { id: cipai.id } }" class="btn-edit">
            编辑
          </router-link>
          <button class="btn-delete" @click="confirmDelete(cipai)">删除</button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <p>确认删除词牌「<strong>{{ deleteTarget.name }}</strong>」？</p>
        <p class="modal-warn">此操作不可撤销</p>
        <div class="modal-actions">
          <button class="btn-cancel" @click="deleteTarget = null">取消</button>
          <button class="btn-confirm-delete" @click="handleDelete">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchCipaiList, deleteCipai, logout } from '../api/cipai'
import { useRouter } from 'vue-router'

const router = useRouter()

const cipaiList = ref([])
const loading = ref(true)
const search = ref('')
const deleteTarget = ref(null)

// 搜索防抖
let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadList(), 300)
}

// 前端过滤（配合后端搜索）
const filteredList = computed(() => {
  if (!search.value.trim()) return cipaiList.value
  const q = search.value.trim().toLowerCase()
  return cipaiList.value.filter(c =>
    c.name.includes(q) ||
    c.id.toLowerCase().includes(q) ||
    c.alias?.some(a => a.includes(q))
  )
})

async function loadList() {
  loading.value = true
  try {
    cipaiList.value = await fetchCipaiList(search.value)
  } catch (err) {
    console.error('加载列表失败', err)
  } finally {
    loading.value = false
  }
}

function confirmDelete(cipai) {
  deleteTarget.value = cipai
}

async function handleDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteCipai(deleteTarget.value.id)
    cipaiList.value = cipaiList.value.filter(c => c.id !== deleteTarget.value.id)
    deleteTarget.value = null
  } catch (err) {
    alert('删除失败：' + (err.response?.data?.message || err.message))
  }
}

function handleLogout() {
  logout()
  router.push({ name: 'Login' })
}

onMounted(loadList)
</script>

<style scoped>
.list-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

/* 顶栏 */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--border);
}

.topbar h1 {
  font-size: 26px;
  color: var(--accent);
}

.topbar-actions {
  display: flex;
  gap: 12px;
}

.btn-add {
  background: var(--accent);
  color: #fff;
  padding: 10px 24px;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 15px;
}

.btn-add:hover {
  background: #a0522d;
}

.btn-logout {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.btn-logout:hover {
  color: var(--danger);
  border-color: var(--danger);
}

/* 搜索 */
.search-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.search-bar input {
  flex: 1;
}

.count {
  color: var(--text-muted);
  font-size: 14px;
  white-space: nowrap;
}

/* 卡片网格 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.15s, box-shadow 0.15s;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(62, 44, 28, 0.12);
}

.card-body {
  padding: 20px 20px 12px;
}

.card-title {
  font-size: 20px;
  color: var(--accent);
  margin-bottom: 8px;
}

.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.badge {
  background: #f0e6d3;
  color: var(--accent);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.alias {
  font-size: 12px;
}

.card-notes {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.card-actions {
  display: flex;
  border-top: 1px solid var(--border);
}

.btn-edit, .btn-delete {
  flex: 1;
  text-align: center;
  padding: 10px;
  font-size: 14px;
  background: transparent;
  border-radius: 0;
}

.btn-edit {
  color: var(--accent);
  border-right: 1px solid var(--border);
  border-radius: 0 0 0 var(--radius);
}

.btn-edit:hover {
  background: #fdf0e0;
}

.btn-delete {
  color: var(--danger);
  border-radius: 0 0 var(--radius) 0;
}

.btn-delete:hover {
  background: #fef0f0;
}

/* 加载/空态 */
.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  font-size: 16px;
}

/* 删除确认弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(62, 44, 28, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(62, 44, 28, 0.16);
  max-width: 360px;
  width: 90%;
}

.modal-warn {
  color: var(--danger);
  font-size: 13px;
  margin-top: 8px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: center;
}

.btn-cancel {
  background: #f0e6d3;
  color: var(--text);
}

.btn-confirm-delete {
  background: var(--danger);
  color: #fff;
}

.btn-confirm-delete:hover {
  background: #a93226;
}
</style>
