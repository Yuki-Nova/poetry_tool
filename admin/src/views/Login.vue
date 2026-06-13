<template>
  <div class="login-page">
    <div class="login-card">
      <h1>📜 词牌管理后台</h1>
      <p class="subtitle">请输入管理员密码</p>
      <form @submit.prevent="handleLogin">
        <input
          v-model="password"
          type="password"
          placeholder="管理员密码"
          autofocus
        />
        <button type="submit" :disabled="loading">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/cipai'

const router = useRouter()
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!password.value.trim()) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    await login(password.value)
    router.push({ name: 'CipaiList' })
  } catch (err) {
    error.value = err.response?.data?.message || '登录失败，请检查密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #fdf6ec 0%, #ede0cc 100%);
}

.login-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 48px 40px;
  width: 380px;
  box-shadow: var(--shadow);
  text-align: center;
}

h1 {
  font-size: 24px;
  color: var(--accent);
  margin-bottom: 8px;
  font-weight: 600;
}

.subtitle {
  color: var(--text-muted);
  margin-bottom: 28px;
  font-size: 14px;
}

input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  margin-bottom: 16px;
}

button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  letter-spacing: 4px;
}

button:hover:not(:disabled) {
  background: #a0522d;
}

button:disabled {
  opacity: 0.6;
}

.error {
  color: var(--danger);
  margin-top: 12px;
  font-size: 14px;
}
</style>
