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
 * 转韵支持（词牌常见，如菩萨蛮/虞美人/西江月仄平交替且逐组换韵部）：
 *   韵脚按「连续同 rhymeType」分段（run-length grouping）——相邻且类型相同
 *   的韵脚归为一段，每段内必须同韵部，段与段之间不比较。
 *   例：虞美人 了/少(仄·第八部) 风/中(平·第一部) 在/改(仄·第五部) 愁/流(平·第十二部)
 *       → 4 段各自内部同部即为合法，段间换部不误报。
 *   而「风(一东)/花(第十部)」连续同平韵却不同部 → 段内出韵，报错。
 *
 * @param {{char: string, line: number, rhymeType?: string|null}[]} rhymeChars - 韵脚字及所在行号（extractRhymeChars 输出）
 * @param {string} rhymeBook - 韵书标识
 * @returns {{
 *   valid: boolean,
 *   group: string|null,
 *   rhymeBook: string,
 *   rhymeBookLabel: string,
 *   allSame: boolean,
 *   errors: {char: string, group: string|null, index: number, line: number}[],
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

  // 连续同 rhymeType 分段（run-length grouping）
  const segments = []
  let cur = null
  for (const c of rhymeChars) {
    const key = c.rhymeType || 'default'
    if (!cur || cur.key !== key) {
      cur = { key, items: [] }
      segments.push(cur)
    }
    cur.items.push({
      char: c.char,
      line: c.line,
      group: getRhymeGroup(c.char, rhymeBook)
    })
  }

  const errors = []
  let firstKnownGroup = null
  let allSame = true
  let unknownTotal = 0

  for (const seg of segments) {
    const known = seg.items.filter(c => c.group !== null)
    const unknown = seg.items.filter(c => c.group === null)
    unknownTotal += unknown.length

    // 该段韵脚全部未收录：整段报错
    if (known.length === 0) {
      unknown.forEach(c => errors.push({ char: c.char, group: null, index: -1, line: c.line }))
      continue
    }

    const baseGroup = known[0].group
    if (!firstKnownGroup) firstKnownGroup = baseGroup

    seg.items.forEach((cg, i) => {
      if (cg.group !== null && cg.group !== baseGroup) {
        errors.push({ char: cg.char, group: cg.group, index: i, line: cg.line })
      }
      if (cg.group === null) {
        errors.push({ char: cg.char, group: null, index: i, line: cg.line })
      }
    })
    if (!known.every(k => k.group === baseGroup)) allSame = false
  }

  return {
    valid: errors.length === 0,
    group: firstKnownGroup,
    rhymeBook,
    rhymeBookLabel: RHYME_BOOK_LABELS[rhymeBook] || '',
    allSame,
    errors,
    neighborWarning: unknownTotal === rhymeChars.length ? '所有韵脚字均未被该韵书收录' : null
  }
}

/**
 * 从逐句分析结果中提取韵脚字
 *
 * 行尾标点处理：取该行**最后一个非 skip/punct 字符**作为韵脚
 * （用户常输入「床前明月光，」——标点在末尾，韵脚字是「光」而非标点）
 * 并携带该句的 rhymeType（供 checkRhyme 转韵分组）。
 *
 * @param {object[][]} lineResults - analyzeText 输出
 * @param {object[]} sentenceMetas - 格律模板 sentences
 * @returns {{char: string, line: number, rhymeType: string|null}[]} 韵脚字及所在行号（0-based）
 */
export function extractRhymeChars(lineResults, sentenceMetas) {
  const chars = []
  lineResults.forEach((line, i) => {
    const meta = sentenceMetas[i]
    if (meta && meta.isRhyme && line.length > 0) {
      // 从行尾向前找第一个非空白/非标点字符（跳过行尾句读）
      let lastChar = null
      for (let j = line.length - 1; j >= 0; j--) {
        const c = line[j]
        if (c.tone !== 'skip' && c.tone !== 'punct') {
          lastChar = c
          break
        }
      }
      if (lastChar) {
        chars.push({ char: lastChar.char, line: i, rhymeType: meta.rhymeType || null })
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
