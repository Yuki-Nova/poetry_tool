/**
 * charClassifier.js — 多音字分类与候选提示
 *
 * 专门处理多音字的读音歧义：
 * - 从 tones.json 中识别标记为 "多音" 的字
 * - 提供候选读音列表
 * - 根据上下文邻字声调给出优先建议
 */

import tones from '../data/tones.json'

/**
 * 已知的多音字候选读音映射
 * key: 字, value: [{reading, tone, meaning}]
 *
 * tone: "平" | "仄"
 */
const MULTI_TONE_MAP = {
  '长': [
    { reading: 'cháng', tone: '平', meaning: '长短' },
    { reading: 'zhǎng', tone: '仄', meaning: '生长' }
  ],
  '还': [
    { reading: 'hái', tone: '平', meaning: '还是' },
    { reading: 'huán', tone: '平', meaning: '归还' }
  ],
  '更': [
    { reading: 'gēng', tone: '平', meaning: '更改' },
    { reading: 'gèng', tone: '仄', meaning: '更加' }
  ],
  '重': [
    { reading: 'chóng', tone: '平', meaning: '重复' },
    { reading: 'zhòng', tone: '仄', meaning: '重量' }
  ],
  '调': [
    { reading: 'tiáo', tone: '平', meaning: '调和' },
    { reading: 'diào', tone: '仄', meaning: '曲调' }
  ],
  '传': [
    { reading: 'chuán', tone: '平', meaning: '传递' },
    { reading: 'zhuàn', tone: '仄', meaning: '传记' }
  ],
  '弹': [
    { reading: 'tán', tone: '平', meaning: '弹琴' },
    { reading: 'dàn', tone: '仄', meaning: '子弹' }
  ],
  '行': [
    { reading: 'xíng', tone: '平', meaning: '行走' },
    { reading: 'háng', tone: '平', meaning: '行列' }
  ],
  '空': [
    { reading: 'kōng', tone: '平', meaning: '天空' },
    { reading: 'kòng', tone: '仄', meaning: '空闲' }
  ],
  '难': [
    { reading: 'nán', tone: '平', meaning: '困难' },
    { reading: 'nàn', tone: '仄', meaning: '灾难' }
  ],
  '冠': [
    { reading: 'guān', tone: '平', meaning: '衣冠' },
    { reading: 'guàn', tone: '仄', meaning: '冠军' }
  ],
  '看': [
    { reading: 'kān', tone: '平', meaning: '看守' },
    { reading: 'kàn', tone: '仄', meaning: '看见' }
  ],
  '相': [
    { reading: 'xiāng', tone: '平', meaning: '互相' },
    { reading: 'xiàng', tone: '仄', meaning: '相貌' }
  ],
  '当': [
    { reading: 'dāng', tone: '平', meaning: '应当' },
    { reading: 'dàng', tone: '仄', meaning: '适当' }
  ],
  '兴': [
    { reading: 'xīng', tone: '平', meaning: '兴盛' },
    { reading: 'xìng', tone: '仄', meaning: '兴趣' }
  ],
  '应': [
    { reading: 'yīng', tone: '平', meaning: '应该' },
    { reading: 'yìng', tone: '仄', meaning: '应答' }
  ],
  '曲': [
    { reading: 'qū', tone: '平', meaning: '弯曲' },
    { reading: 'qǔ', tone: '仄', meaning: '歌曲' }
  ],
  '数': [
    { reading: 'shǔ', tone: '仄', meaning: '数数' },
    { reading: 'shù', tone: '仄', meaning: '数字' }
  ],
  '思': [
    { reading: 'sī', tone: '平', meaning: '思考' },
    { reading: 'sì', tone: '仄', meaning: '情思' }
  ],
  '忘': [
    { reading: 'wáng', tone: '平', meaning: '遗忘(平)' },
    { reading: 'wàng', tone: '仄', meaning: '忘记' }
  ]
}

/**
 * 检查某个字是否为多音字
 * @param {string} char
 * @returns {boolean}
 */
export function isMultiTone(char) {
  const record = tones[char]
  return record === '多音' || record === '多' || !!MULTI_TONE_MAP[char]
}

/**
 * 获取多音字的候选读音列表
 * @param {string} char
 * @returns {{reading: string, tone: string, meaning: string}[]}
 */
export function getCandidates(char) {
  return MULTI_TONE_MAP[char] || []
}

/**
 * 根据上下文邻字声调，给出多音字的优先建议
 *
 * 启发式规则：
 * - 若邻字为仄声，多音字读平声可能性更高（平仄交替），反之亦然
 * - 默认返回第一个候选
 *
 * @param {string} char - 多音字
 * @param {string} prevTone - 前一字声调（可为 null）
 * @param {string} nextTone - 后一字声调（可为 null）
 * @returns {{reading: string, tone: string, meaning: string}|null}
 */
export function suggestReading(char, prevTone, nextTone) {
  const candidates = MULTI_TONE_MAP[char]
  if (!candidates || candidates.length === 0) return null

  // 只有平仄不同的候选才需要建议
  const tones = candidates.map(c => c.tone)
  const uniqueTones = [...new Set(tones)]
  if (uniqueTones.length === 1) return candidates[0]

  // 检查邻字声调：若前字为仄，倾向于选平（平仄交替）
  const neighborTone = prevTone || nextTone
  if (neighborTone === '仄') {
    const ping = candidates.find(c => c.tone === '平')
    if (ping) return ping
  }
  if (neighborTone === '平') {
    const ze = candidates.find(c => c.tone === '仄')
    if (ze) return ze
  }

  return candidates[0]
}

/**
 * 批量获取文本中所有多音字的位置和候选
 * @param {string[][]} lineResults - analyzeText 的输出
 * @returns {{line: number, col: number, char: string, candidates: {reading: string, tone: string, meaning: string}[], suggested: {reading: string, tone: string, meaning: string}|null}[]}
 */
export function findAllMultiTone(lineResults) {
  const results = []
  lineResults.forEach((line, li) => {
    line.forEach((item, ci) => {
      if (item.isMulti) {
        const prevTone = ci > 0 ? line[ci - 1].tone : null
        const nextTone = ci < line.length - 1 ? line[ci + 1].tone : null
        results.push({
          line: li,
          col: ci,
          char: item.char,
          candidates: getCandidates(item.char),
          suggested: suggestReading(item.char, prevTone, nextTone)
        })
      }
    })
  })
  return results
}
