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
 *
 * 性能策略：
 *   rAF 节流代替 debounce，感知零延迟
 *   IME 组合输入期间暂停分析
 */

import { ref, computed, watch } from 'vue'
import { analyzeText } from '../core/toneAnalyzer'
import { checkRhyme, extractRhymeChars, defaultRhymeBook, RHYME_BOOKS, RHYME_BOOK_LABELS } from '../core/rhymeChecker'
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

  // 多音字读音覆盖表：{ "line:col": { char, tone } }（用户点击候选后固定该字声调）
  const toneOverrides = ref({})

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

  /** 将读音覆盖应用到逐字分析结果（该字仍为同一字符时生效） */
  function applyToneOverrides(lines) {
    const overrides = toneOverrides.value
    if (!Object.keys(overrides).length) return lines
    return lines.map((line, li) =>
      line.map((item, ci) => {
        const ov = overrides[`${li}:${ci}`]
        if (ov && ov.char === item.char) {
          return { ...item, tone: ov.tone, isMulti: false }
        }
        return item
      })
    )
  }

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
      // 按有效韵书选择平仄表（xinyun=现代表，平水/词林=中古表）
      const lines = analyzeText(rawText, effectiveRhymeBook.value)
      lineResults.value = lines

      const template = pattern.value?.sentences || []
      const rb = effectiveRhymeBook.value
      const matched = matchPattern(applyToneOverrides(lines), template, rb)
      matchResults.value = matched

      const rhymeChars = extractRhymeChars(lines, template)
      const rhyme = checkRhyme(rhymeChars, rb)

      rhymeResult.value = rhyme
      errors.value = collectErrors(matched, rhyme)
      multiToneList.value = findAllMultiTone(lines)
    } catch (err) {
      console.error('[useAnalysis] 分析出错:', err)
    } finally {
      analyzing.value = false
    }
  }

  // ========== 即时分析：每次输入立即触发（<1ms 无需节流）==========
  watch(
    [text, pattern, effectiveRhymeBook],
    () => runAnalysis(),
    { immediate: true }
  )

  // 手动设置某个位置的读音（点击多音字候选时调用）
  function setToneOverride(line, col, char, tone) {
    toneOverrides.value = {
      ...toneOverrides.value,
      [`${line}:${col}`]: { char, tone }
    }
    runAnalysis()
  }

  // 撤销某位置的读音覆盖：文本编辑后 line:col 失配自动忽略，无需手动清理

  return {
    analyzing, lineResults, matchResults, rhymeResult,
    errors, multiToneList, stats, allCorrect,
    runAnalysis, effectiveRhymeBook, setToneOverride,
    RHYME_BOOKS, RHYME_BOOK_LABELS
  }
}
