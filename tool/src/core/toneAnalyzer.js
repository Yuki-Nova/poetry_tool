/**
 * toneAnalyzer.js — 平仄分析引擎
 *
 * 输入：一句诗的字符串
 * 输出：逐字分析结果 [{char, tone, isMulti}]
 *
 * tone 取值：
 *   "平"   — 平声（阴平/阳平）
 *   "仄"   — 仄声（上声/去声/入声）
 *   "多音" — 多音字，需根据语境判断
 *   "?"    — 字典未收录
 *
 * 双平仄表（古今音方案）：
 *   classic（中古） ← 平水韵推导，适用于 平水韵/词林正韵
 *   modern（现代）  ← 中华新韵推导，适用于 中华新韵
 *   优先级：custom 人工覆盖 > 对应韵书表 > 默认表（classic）
 */

import tones from '../data/tones.json'
import tonesClassic from '../data/tones-classic.json'
import tonesModern from '../data/tones-modern.json'
import custom from '../data/custom.json'

/** 韵书 → 平仄表映射（未知韵书回退 classic，兼容旧调用） */
function tableFor(rhymeBook) {
  if (rhymeBook === 'xinyun') return tonesModern
  return tonesClassic
}

/**
 * 查平仄：custom > 对应韵书表 > 合并表（旧单表，回退）
 * @param {string} char
 * @param {string} [rhymeBook] - 韵书 key（xinyun=现代，其他=中古）
 */
function lookupTone(char, rhymeBook) {
  if (custom.tones[char]) return custom.tones[char]
  const tbl = tableFor(rhymeBook)
  if (tbl[char] !== undefined) return tbl[char]
  // 双表都未收录：回退到合并单表（向后兼容旧数据）
  if (tones[char] !== undefined) return tones[char]
  return undefined
}

/**
 * 分析单句诗的逐字平仄
 * @param {string} line - 一句诗
 * @param {string} [rhymeBook] - 韵书 key，决定使用中古表还是现代表
 * @returns {{char: string, tone: string, isMulti: boolean}[]}
 */
export function analyzeLine(line, rhymeBook) {
  if (!line || typeof line !== 'string') return []

  return [...line].map(char => {
    // 跳过空白字符
    if (/^\s$/.test(char)) {
      return { char, tone: 'skip', isMulti: false }
    }

    // 跳过标点
    if (/^[，。！？、；：""''《》（）…—\-,.!?;:'"()]$/.test(char)) {
      return { char, tone: 'punct', isMulti: false }
    }

    const record = lookupTone(char, rhymeBook)

    if (!record) {
      return { char, tone: '?', isMulti: false }
    }

    if (record === '多音' || record === '多') {
      return { char, tone: '多音', isMulti: true }
    }

    return { char, tone: record, isMulti: false }
  })
}

/**
 * 分析多行诗
 *
 * 逐行原样分析：不 trim、不过滤空行，
 * 保证结果行号与文本行号一一对应（供高亮层、错误跳转定位）。
 * 行内的空格/标点由 analyzeLine 标记为 skip/punct，不参与比对。
 *
 * @param {string} text - 完整诗词文本（可包含换行）
 * @param {string} [rhymeBook] - 韵书 key，决定使用中古表还是现代表
 * @returns {{char: string, tone: string, isMulti: boolean}[][]}
 */
export function analyzeText(text, rhymeBook) {
  if (!text) return []
  return text.split('\n').map(line => analyzeLine(line, rhymeBook))
}
