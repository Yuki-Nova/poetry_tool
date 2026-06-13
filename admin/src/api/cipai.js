/**
 * 词牌 API 封装层
 * 所有对后端的 HTTP 请求统一管理
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器：自动附加 JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('poetry_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 时清除 token 并跳转登录
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('poetry_token')
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

// ── 认证 ──

/** 登录，返回 token */
export function login(password) {
  return api.post('/login', { password }).then(res => {
    const token = res.data.data.token
    localStorage.setItem('poetry_token', token)
    return token
  })
}

/** 登出 */
export function logout() {
  localStorage.removeItem('poetry_token')
}

/** 是否已登录 */
export function isLoggedIn() {
  return !!localStorage.getItem('poetry_token')
}

// ── 词牌 CRUD ──

/** 获取词牌列表（支持搜索） */
export function fetchCipaiList(search = '') {
  return api.get('/cipai', { params: search ? { search } : {} }).then(res => res.data.data)
}

/** 获取单条词牌 */
export function fetchCipai(id) {
  return api.get(`/cipai/${id}`).then(res => res.data.data)
}

/** 新建词牌 */
export function createCipai(cipai) {
  return api.post('/cipai', cipai).then(res => res.data.data)
}

/** 更新词牌 */
export function updateCipai(id, cipai) {
  return api.put(`/cipai/${id}`, cipai).then(res => res.data.data)
}

/** 删除词牌 */
export function deleteCipai(id) {
  return api.delete(`/cipai/${id}`).then(res => res.data)
}
