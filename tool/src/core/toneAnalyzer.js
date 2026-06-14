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
 */

import tones from '../data/tones.json'
import custom from '../data/custom.json'

/**
 * 查平仄：custom > tones
 */
function lookupTone(char) {
  if (custom.tones[char]) return custom.tones[char]
  return tones[char]
}

/**
 * 分析单句诗的逐字平仄
 * @param {string} line - 一句诗
 * @returns {{char: string, tone: string, isMulti: boolean}[]}
 */
export function analyzeLine(line) {
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

    const record = lookupTone(char)

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
 * @param {string} text - 完整诗词文本（可包含换行）
 * @returns {{char: string, tone: string, isMulti: boolean}[][]}
 */
export function analyzeText(text) {
  if (!text) return []
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => analyzeLine(line))
}
