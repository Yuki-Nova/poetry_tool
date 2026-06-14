/**
 * usePattern.js — 格律模板管理
 *
 * 管理当前选中的格律模板：
 * - 内置 8 种诗歌格律（从 shige.json 加载）
 * - 外部词牌格律（从 useCipai 获取）
 * - 响应式当前选中模板
 */

import { ref, computed } from 'vue'
import shigeData from '../data/patterns/shige.json'

// 内置诗歌模板
const builtinPatterns = shigeData.patterns.map(p => ({
  ...p,
  source: 'builtin',
  label: p.name
}))

/**
 * @param {import('vue').Ref} cipaiList - useCipai 返回的 list
 */
export function usePattern(cipaiList) {
  // 当前选中的模板 ID
  const selectedId = ref('wujue-zeqi')

  // 合并的内置 + 词牌列表
  const allPatterns = computed(() => {
    const cipai = (cipaiList?.value || []).map(c => ({
      id: c.id,
      name: c.name,
      type: '词牌',
      charCount: c.charCount,
      sentences: c.sentences,
      notes: c.notes || '',
      alias: c.alias || [],
      source: 'api',
      label: c.name
    }))
    return [...builtinPatterns, ...cipai]
  })

  // 当前选中的模板对象
  const currentPattern = computed(() => {
    return allPatterns.value.find(p => p.id === selectedId.value) || builtinPatterns[0]
  })

  /**
   * 切换模板
   * @param {string} id
   */
  function selectPattern(id) {
    selectedId.value = id
  }

  /**
   * 按类别分组（供 UI 下拉框使用）
   */
  const groupedPatterns = computed(() => {
    const groups = {}
    allPatterns.value.forEach(p => {
      const type = p.type || '其他'
      if (!groups[type]) groups[type] = []
      groups[type].push(p)
    })
    return groups
  })

  return {
    selectedId,
    allPatterns,
    currentPattern,
    groupedPatterns,
    builtinPatterns,
    selectPattern
  }
}
