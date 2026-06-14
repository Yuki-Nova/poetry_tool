/**
 * rhymeChecker.js — 押韵校验引擎（支持多韵书）
 *
 * 输入：韵脚字数组 + 韵书选择
 * 输出：是否同韵部、韵部名称、不押韵的字
 *
 * 韵书：
 *   "xinyun"   — 中华新韵（14 韵部，诗用默认）
 *   "pingshui" — 平水韵（105 韵部，备选）
 *   "cilin"    — 词林正韵（19 韵部，词用默认）
 */

import xinyunData from '../data/rhymes/xinyun.json'
import pingshuiData from '../data/rhymes/pingshui.json'
import cilinData from '../data/rhymes/cilin.json'
import custom from '../data/custom.json'

// 所有韵书索引
const RHYME_BOOKS = {
  xinyun: xinyunData,
  pingshui: pingshuiData,
  cilin: cilinData
}

// 韵书显示名
const RHYME_BOOK_LABELS = {
  xinyun: '中华新韵',
  pingshui: '平水韵',
  cilin: '词林正韵'
}

/**
 * 查找某字在指定韵书中所属韵部
 * @param {string} char
 * @param {string} rhymeBook - "xinyun" | "pingshui" | "cilin"
 * @returns {string|null}
 */
export function getRhymeGroup(char, rhymeBook = 'xinyun') {
  // 1. custom 覆写优先
  if (custom.rhymes[rhymeBook] && custom.rhymes[rhymeBook][char]) {
    return custom.rhymes[rhymeBook][char]
  }
  // 2. 主数据
  const book = RHYME_BOOKS[rhymeBook]
  if (!book) return null
  for (const group of book.groups) {
    if (group.chars.includes(char)) {
      return group.name
    }
  }
  return null
}

/**
 * 校验一组韵脚字是否押韵
 *
 * @param {string[]} rhymeChars - 韵脚字数组
 * @param {string} rhymeBook - 韵书标识
 * @returns {{
 *   valid: boolean,
 *   group: string|null,
 *   rhymeBook: string,
 *   rhymeBookLabel: string,
 *   allSame: boolean,
 *   errors: {char: string, group: string|null, index: number}[],
 *   neighborWarning: string|null
 * }}
 */
export function checkRhyme(rhymeChars, rhymeBook = 'xinyun') {
  if (!rhymeChars || rhymeChars.length < 2) {
    return {
      valid: true, group: null, rhymeBook, rhymeBookLabel: RHYME_BOOK_LABELS[rhymeBook] || '',
      allSame: true, errors: [], neighborWarning: null
    }
  }

  const charGroups = rhymeChars.map((char, i) => ({
    char,
    group: getRhymeGroup(char, rhymeBook),
    index: i
  }))

  const known = charGroups.filter(c => c.group !== null)
  const unknown = charGroups.filter(c => c.group === null)

  if (known.length === 0) {
    return {
      valid: false, group: null, rhymeBook, rhymeBookLabel: RHYME_BOOK_LABELS[rhymeBook] || '',
      allSame: false,
      errors: unknown.map(c => ({ char: c.char, group: null, index: c.index })),
      neighborWarning: '所有韵脚字均未被该韵书收录'
    }
  }

  const baseGroup = known[0].group
  const errors = []

  for (const cg of charGroups) {
    if (cg.group !== null && cg.group !== baseGroup) {
      errors.push({ char: cg.char, group: cg.group, index: cg.index })
    }
    if (cg.group === null) {
      errors.push({ char: cg.char, group: null, index: cg.index })
    }
  }

  return {
    valid: errors.length === 0,
    group: baseGroup,
    rhymeBook,
    rhymeBookLabel: RHYME_BOOK_LABELS[rhymeBook] || '',
    allSame: known.every(k => k.group === baseGroup),
    errors,
    neighborWarning: null
  }
}

/**
 * 从逐句分析结果中提取韵脚字
 */
export function extractRhymeChars(lineResults, sentenceMetas) {
  const chars = []
  lineResults.forEach((line, i) => {
    const meta = sentenceMetas[i]
    if (meta && meta.isRhyme && line.length > 0) {
      const lastChar = line[line.length - 1]
      if (lastChar && lastChar.tone !== 'skip' && lastChar.tone !== 'punct') {
        chars.push(lastChar.char)
      }
    }
  })
  return chars
}

/**
 * 根据体裁自动选择默认韵书
 * 诗 → 中华新韵，词 → 词林正韵
 */
export function defaultRhymeBook(patternType) {
  if (!patternType) return 'xinyun'
  const t = String(patternType)
  if (t.includes('词牌') || t.includes('词')) return 'cilin'
  return 'xinyun'
}

export { RHYME_BOOKS, RHYME_BOOK_LABELS }
