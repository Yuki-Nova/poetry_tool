/**
 * patternMatcher.js — 格律匹配引擎
 *
 * 将 toneAnalyzer 的逐字分析结果与格律模板逐位比对，
 * 标出每个字的匹配状态。
 *
 * 状态值：
 *   "ok"         — 平仄正确
 *   "tone-error" — 平仄错误（出律）
 *   "multi-tone" — 多音字（待人工判断）
 *   "unknown"    — 字典未收录
 *   "skip"       — 空格/标点，不参与比对
 */

/**
 * 单字匹配：判断实际声调是否满足格律要求
 *
 * @param {string} actual - 实际声调 "平"|"仄"|"多音"|"?"|"skip"|"punct"
 * @param {string} expected - 格律要求 "平"|"仄"|"可平可仄"|"韵脚"
 * @returns {string} 匹配状态
 */
function matchChar(actual, expected) {
  // 空格/标点不参与比对
  if (actual === 'skip' || actual === 'punct') return 'skip'

  // 字典未收录
  if (actual === '?') return 'unknown'

  // 多音字（兼容 "多音" 和 "多" 两种标注）
  if (actual === '多音' || actual === '多') return 'multi-tone'

  // 可平可仄：无论如何都算对
  if (expected === '可平可仄') return 'ok'

  // 韵脚：当作平仄要求来处理（韵脚的具体声调由 rhymeType 决定）
  if (expected === '韵脚') {
    return actual === '平' ? 'ok-rhyme' : 'rhyme-warn'
  }

  // 精确匹配
  return actual === expected ? 'ok' : 'tone-error'
}

/**
 * 将整首诗的分析结果与格律模板逐字比对
 *
 * @param {{char: string, tone: string, isMulti: boolean}[][]} lineResults - analyzeText 输出
 * @param {{pattern: string[], isRhyme: boolean, rhymeType: string|null}[]} template - 格律模板 sentences 数组
 * @returns {{
 *   char: string,
 *   expected: string,
 *   actual: string,
 *   isRhyme: boolean,
 *   rhymeGroup: string|null,
 *   status: string
 * }[][]}
 */
export function matchPattern(lineResults, template) {
  if (!lineResults || !template) return []

  return lineResults.map((line, li) => {
    const sentenceMeta = template[li] || null
    if (!sentenceMeta) {
      // 超出模板的行：全部标为未知
      return line.map(item => ({
        char: item.char,
        expected: '?',
        actual: item.tone,
        isRhyme: false,
        rhymeGroup: null,
        status: 'unknown'
      }))
    }

    const { pattern, isRhyme, rhymeType } = sentenceMeta

    // 对每个字进行匹配
    return line.map((item, ci) => {
      const expected = pattern[ci] || '?'
      const status = matchChar(item.tone, expected)

      return {
        char: item.char,
        expected,
        actual: item.tone,
        isRhyme: isRhyme && ci === line.length - 1,
        rhymeGroup: null,  // 由外部 rhymeChecker 填充
        status
      }
    })
  })
}

/**
 * 汇总所有错误（出律 + 出韵）
 *
 * @param {object[][]} matchResults - matchPattern 输出
 * @param {{valid: boolean, errors: {char: string, index: number}[]}} rhymeResult - checkRhyme 输出
 * @returns {{line: number, col: number, char: string, type: string, message: string}[]}
 */
export function collectErrors(matchResults, rhymeResult) {
  const errors = []

  matchResults.forEach((line, li) => {
    line.forEach((item, ci) => {
      if (item.status === 'tone-error') {
        errors.push({
          line: li,
          col: ci,
          char: item.char,
          type: 'tone',
          message: `"${item.char}" 应为 ${item.expected} 声，实际为 ${item.actual} 声（出律）`
        })
      }
      if (item.status === 'unknown') {
        errors.push({
          line: li,
          col: ci,
          char: item.char,
          type: 'unknown',
          message: `"${item.char}" 未在平仄字典中收录`
        })
      }
      // 多音字不视为出律，不在错误列表中显示
    })
  })

  // 添加押韵错误
  if (rhymeResult && rhymeResult.errors) {
    rhymeResult.errors.forEach(e => {
      errors.push({
        line: e.index,
        col: -1,
        char: e.char,
        type: 'rhyme',
        message: e.group
          ? `"${e.char}" 属 "${e.group}" 韵，与基准韵部 "${rhymeResult.group}" 不同（出韵）`
          : `"${e.char}" 未在韵书中收录`
      })
    })
  }

  return errors
}
