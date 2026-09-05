/**
 * useCipai.js — 词牌数据管理
 *
 * 从后端 /api/cipai 拉取词牌列表，缓存结果，
 * 供 PatternSelector 使用。
 */

import { ref, shallowRef } from 'vue'

// P1 静态化：数据源从后端 API 改为静态 JSON（export-static.py 产物，
// vite 构建时 public/ 自动拷入 dist，页面在 /poetry/ 下解析为 /poetry/cipai.json）。
// 相对路径保证 dev（/）与生产子路径（/poetry/）同时可用。
const DATA_URL = 'cipai.json'

// 全局缓存（模块级单例，跨组件共享）
const cache = shallowRef(null)
const loading = ref(false)
const error = ref(null)

/**
 * 获取词牌列表（带缓存）
 * @param {boolean} force - 是否强制刷新
 * @returns {{ list: import('vue').Ref, loading: import('vue').Ref, error: import('vue').Ref, refresh: () => Promise<void> }}
 */
export function useCipai(force = false) {
  async function refresh() {
    if (cache.value && !force) return

    loading.value = true
    error.value = null

    try {
      const res = await fetch(DATA_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.code === 0) {
        cache.value = json.data
      } else {
        throw new Error(json.message || '未知错误')
      }
    } catch (err) {
      error.value = err.message
      console.error('[useCipai] 加载词牌列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 首次调用时自动加载
  if (!cache.value) {
    refresh()
  }

  return {
    list: cache,
    loading,
    error,
    refresh
  }
}
