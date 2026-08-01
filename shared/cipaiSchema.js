/**
 * 词牌数据结构唯一定义
 * tool / admin / server 三端共同 import，保证数据格式一致
 */

/**
 * 单句格律模式中的合法取值
 */
const TONE_VALUES = ['平', '仄', '可平可仄', '韵脚']

/**
 * 韵脚类型合法取值
 */
const RHYME_TYPES = ['平韵', '仄韵', '可平可仄']

/**
 * 构建一个新的空词牌对象
 * @returns {object} 空词牌
 */
function createEmptyCipai() {
  return {
    id: '',
    name: '',
    alias: [],
    charCount: 0,
    sentences: [],
    formats: [],
    notes: '',
    examples: []
  }
}

/** 校验单个格式的句子数组（与顶层 sentences 同一套规则） */
function validateFormatSentences(sentences, errors, prefix) {
  if (!Array.isArray(sentences) || sentences.length === 0) {
    errors.push(`${prefix}：至少需要一句格律定义`)
    return
  }
  sentences.forEach((s, i) => {
    if (s.index !== i) {
      errors.push(`${prefix} 句 ${i}: index 应为 ${i}，实际 ${s.index}`)
    }
    if (!s.length || s.length < 1) {
      errors.push(`${prefix} 句 ${i}: length 至少为 1`)
    }
    if (!Array.isArray(s.pattern) || s.pattern.length !== s.length) {
      errors.push(`${prefix} 句 ${i}: pattern 数组长度 (${s.pattern?.length ?? 0}) 与 length (${s.length}) 不匹配`)
    } else {
      s.pattern.forEach((t, j) => {
        if (!TONE_VALUES.includes(t)) {
          errors.push(`${prefix} 句 ${i} 字 ${j}: 非法格律值 "${t}"，合法值: ${TONE_VALUES.join(' / ')}`)
        }
      })
    }
    if (typeof s.isRhyme !== 'boolean') {
      errors.push(`${prefix} 句 ${i}: isRhyme 须为布尔值`)
    }
    if (s.isRhyme && s.rhymeType && !RHYME_TYPES.includes(s.rhymeType)) {
      errors.push(`${prefix} 句 ${i}: 非法 rhymeType "${s.rhymeType}"，合法值: ${RHYME_TYPES.join(' / ')}`)
    }
  })
}

/**
 * 校验词牌数据合法性
 * @param {object} cipai - 词牌对象
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCipai(cipai) {
  const errors = []

  if (!cipai) {
    errors.push('数据不能为空')
    return { valid: false, errors }
  }

  // id: 必填，字母数字下划线连字符
  if (!cipai.id || !/^[a-z][a-z0-9_-]*$/i.test(cipai.id)) {
    errors.push('id 必填，须以字母开头，仅含字母数字下划线连字符')
  }

  // name: 必填
  if (!cipai.name || !cipai.name.trim()) {
    errors.push('词牌名 name 必填')
  }

  // alias: 须为数组
  if (cipai.alias && !Array.isArray(cipai.alias)) {
    errors.push('alias 须为字符串数组')
  }

  // sentences: 必填，至少一句
  if (!Array.isArray(cipai.sentences) || cipai.sentences.length === 0) {
    errors.push('至少需要一句格律定义')
  } else {
    let totalChars = 0
    cipai.sentences.forEach((s, i) => {
      if (s.index !== i) {
        errors.push(`句 ${i}: index 应为 ${i}，实际 ${s.index}`)
      }
      if (!s.length || s.length < 1) {
        errors.push(`句 ${i}: length 至少为 1`)
      }
      if (!Array.isArray(s.pattern) || s.pattern.length !== s.length) {
        errors.push(`句 ${i}: pattern 数组长度 (${s.pattern?.length ?? 0}) 与 length (${s.length}) 不匹配`)
      } else {
        s.pattern.forEach((t, j) => {
          if (!TONE_VALUES.includes(t)) {
            errors.push(`句 ${i} 字 ${j}: 非法格律值 "${t}"，合法值: ${TONE_VALUES.join(' / ')}`)
          }
        })
      }
      if (typeof s.isRhyme !== 'boolean') {
        errors.push(`句 ${i}: isRhyme 须为布尔值`)
      }
      if (s.isRhyme && s.rhymeType && !RHYME_TYPES.includes(s.rhymeType)) {
        errors.push(`句 ${i}: 非法 rhymeType "${s.rhymeType}"，合法值: ${RHYME_TYPES.join(' / ')}`)
      }
      totalChars += s.length || 0
    })

    if (cipai.charCount && cipai.charCount !== totalChars) {
      errors.push(`charCount (${cipai.charCount}) 与所有句子长度之和 (${totalChars}) 不一致`)
    }
  }

  // formats: 可选（多格式变体）；存在时校验每个格式的 sentences，并核对 formats[0] 与顶层一致
  if (cipai.formats !== undefined && cipai.formats !== null) {
    if (!Array.isArray(cipai.formats) || cipai.formats.length === 0) {
      errors.push('formats 须为非空数组（可为空数组，表示单格式）')
    } else {
      cipai.formats.forEach((f, fi) => {
        const prefix = `格式 ${fi}${f.label ? `（${f.label}）` : ''}`
        if (!f || typeof f !== 'object') {
          errors.push(`${prefix}: 格式项须为对象`)
          return
        }
        if (f.label !== undefined && typeof f.label !== 'string') {
          errors.push(`${prefix}: label 须为字符串`)
        }
        validateFormatSentences(f.sentences, errors, prefix)
      })
      // formats[0] 与顶层 sentences 一致性（仅当两者都存在时核对）
      if (Array.isArray(cipai.sentences) && cipai.sentences.length > 0
          && cipai.formats[0] && Array.isArray(cipai.formats[0].sentences)
          && cipai.formats[0].sentences.length > 0) {
        const mainSig = cipai.sentences.map(s => `${s.length}:${(s.pattern || []).join('')}:${s.isRhyme ? 1 : 0}`).join('|')
        const fmtSig = cipai.formats[0].sentences.map(s => `${s.length}:${(s.pattern || []).join('')}:${s.isRhyme ? 1 : 0}`).join('|')
        if (mainSig !== fmtSig) {
          errors.push('formats[0]（主格式）与顶层 sentences 不一致')
        }
      }
    }
  }

  // examples: 可选（例词列表）；存在时校验每项 {author, text, note}
  if (cipai.examples !== undefined && cipai.examples !== null) {
    if (!Array.isArray(cipai.examples)) {
      errors.push('examples 须为数组')
    } else {
      cipai.examples.forEach((ex, i) => {
        if (!ex || typeof ex !== 'object') {
          errors.push(`例词 ${i}: 例词项须为对象`)
          return
        }
        if (ex.author !== undefined && typeof ex.author !== 'string') {
          errors.push(`例词 ${i}: author 须为字符串`)
        }
        if (typeof ex.text !== 'string' || !ex.text.trim()) {
          errors.push(`例词 ${i}: text 必填且须为字符串`)
        }
        if (ex.note !== undefined && typeof ex.note !== 'string') {
          errors.push(`例词 ${i}: note 须为字符串`)
        }
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

module.exports = {
  TONE_VALUES,
  RHYME_TYPES,
  createEmptyCipai,
  validateCipai
}
