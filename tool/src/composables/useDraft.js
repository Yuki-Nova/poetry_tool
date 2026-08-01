/**
 * useDraft.js — 草稿自动保存
 *
 * 将用户输入文本 + 当前格律模板 + 韵书选择自动保存到 localStorage，
 * 页面刷新/误关后自动恢复。文本为空时不保存（避免残留空草稿）。
 */

import { ref, watch } from 'vue'

const STORAGE_KEY = 'poetry-draft:v1'
const SAVE_DEBOUNCE = 400

/**
 * @param {object} options
 * @param {import('vue').Ref<string>} options.text - 输入文本
 * @param {import('vue').Ref<string>} options.patternId - 当前格律模板 ID
 * @param {import('vue').Ref<string|null>} options.rhymeBook - 韵书选择（可空）
 * @param {boolean} [options.enabled=true] - 是否启用（SSR/隐私模式降级）
 */
export function useDraft({ text, patternId, rhymeBook, enabled = true }) {
  const restored = ref(false)
  const hasDraft = ref(false)
  const savedAt = ref(null)
  let pendingTimer = null

  /** 读取本地草稿（无/损坏返回 null） */
  function load() {
    if (!enabled) return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const draft = JSON.parse(raw)
      if (typeof draft.text !== 'string' || !draft.text.trim()) return null
      return draft
    } catch (err) {
      console.warn('[useDraft] 读取草稿失败:', err)
      return null
    }
  }

  /** 保存草稿（400ms debounce；空文本则清除） */
  function scheduleSave() {
    if (!enabled) return
    const t = setTimeout(() => {
      try {
        if (!text.value || !text.value.trim()) {
          localStorage.removeItem(STORAGE_KEY)
          hasDraft.value = false
          return
        }
        const draft = {
          text: text.value,
          patternId: patternId.value,
          rhymeBook: rhymeBook.value || null,
          savedAt: Date.now()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
        hasDraft.value = true
        savedAt.value = draft.savedAt
      } catch (err) {
        console.warn('[useDraft] 保存草稿失败:', err)
      }
    }, SAVE_DEBOUNCE)
    pendingTimer = t
  }

  watch([text, patternId, rhymeBook], () => {
    if (pendingTimer) clearTimeout(pendingTimer)
    scheduleSave()
  })
  /** 显式清除草稿 */
  function clear() {
    if (pendingTimer) clearTimeout(pendingTimer)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.warn('[useDraft] 清除草稿失败:', err)
    }
    hasDraft.value = false
    savedAt.value = null
    restored.value = false
  }

  return { load, clear, hasDraft, restored, savedAt }
}
