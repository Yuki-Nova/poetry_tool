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
    notes: ''
  }
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

  return { valid: errors.length === 0, errors }
}

module.exports = {
  TONE_VALUES,
  RHYME_TYPES,
  createEmptyCipai,
  validateCipai
}
