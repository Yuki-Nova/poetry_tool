/**
 * useAnalysis.js — 分析流程封装（支持多韵书）
 *
 * 连接 core 层与 UI 层：
 *   用户输入 → toneAnalyzer → rhymeChecker + patternMatcher → 响应式结果
 *
 * 韵书自动选择：
 *   诗体 → 中华新韵
 *   词牌 → 词林正韵
 *   用户可手动覆盖
 */

import { ref, computed, watch } from 'vue'
import { analyzeText } from '../core/toneAnalyzer'
import { checkRhyme, extractRhymeChars, getRhymeGroup, defaultRhymeBook, RHYME_BOOKS, RHYME_BOOK_LABELS } from '../core/rhymeChecker'
import { matchPattern, collectErrors } from '../core/patternMatcher'
import { findAllMultiTone } from '../core/charClassifier'

/**
 * @param {import('vue').Ref<string>} text - 用户输入文本
 * @param {import('vue').Ref<object>} pattern - 当前格律模板
 * @param {import('vue').Ref<string>} rhymeBookOverride - 手动选择的韵书（可选）
 */
export function useAnalysis(text, pattern, rhymeBookOverride) {
  const analyzing = ref(false)
  const lineResults = ref([])
  const matchResults = ref([])
  const rhymeResult = ref({
    valid: true, group: null, rhymeBook: 'xinyun', rhymeBookLabel: '',
    allSame: true, errors: [], neighborWarning: null
  })
  const errors = ref([])
  const multiToneList = ref([])

  // 实际使用的韵书：手动覆盖 > 自动推导
  const effectiveRhymeBook = computed(() => {
    if (rhymeBookOverride?.value) return rhymeBookOverride.value
    return defaultRhymeBook(pattern.value?.type)
  })

  const stats = computed(() => {
    let totalChars = 0, okCount = 0, errorCount = 0, multiCount = 0
    matchResults.value.forEach(line => {
      line.forEach(item => {
        if (item.status === 'skip') return
        totalChars++
        if (item.status === 'ok' || item.status === 'ok-rhyme') okCount++
        else if (item.status === 'tone-error') errorCount++
        else if (item.status === 'multi-tone') multiCount++
      })
    })
    return { totalChars, okCount, errorCount, multiCount,
      accuracy: totalChars > 0 ? Math.round((okCount / totalChars) * 100) : 100 }
  })

  const allCorrect = computed(() => stats.value.errorCount === 0 && rhymeResult.value.valid)

  function runAnalysis() {
    const rawText = typeof text.value === 'string' ? text.value : ''
    if (!rawText.trim()) {
      lineResults.value = []
      matchResults.value = []
      rhymeResult.value = { valid: true, group: null, rhymeBook: effectiveRhymeBook.value, rhymeBookLabel: '', allSame: true, errors: [], neighborWarning: null }
      errors.value = []
      multiToneList.value = []
      return
    }

    analyzing.value = true
    try {
      const lines = analyzeText(rawText)
      lineResults.value = lines

      const template = pattern.value?.sentences || []
      const matched = matchPattern(lines, template)
      matchResults.value = matched

      const rhymeChars = extractRhymeChars(lines, template)
      const rb = effectiveRhymeBook.value
      const rhyme = checkRhyme(rhymeChars, rb)

      // 回填韵部信息
      matched.forEach((line, li) => {
        line.forEach(item => {
          if (item.isRhyme) {
            item.rhymeGroup = getRhymeGroup(item.char, rb)
          }
        })
      })
      matchResults.value = [...matched]

      rhymeResult.value = rhyme
      errors.value = collectErrors(matched, rhyme)
      multiToneList.value = findAllMultiTone(lines)
    } catch (err) {
      console.error('[useAnalysis] 分析出错:', err)
    } finally {
      analyzing.value = false
    }
  }

  let debounceTimer = null
  watch([text, pattern, effectiveRhymeBook], () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(runAnalysis, 200)
  }, { immediate: true, deep: true })

  return {
    analyzing, lineResults, matchResults, rhymeResult,
    errors, multiToneList, stats, allCorrect,
    runAnalysis, effectiveRhymeBook,
    RHYME_BOOKS, RHYME_BOOK_LABELS
  }
}
