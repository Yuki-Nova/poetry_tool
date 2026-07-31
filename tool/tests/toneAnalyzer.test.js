/**
 * toneAnalyzer 单元测试
 * 重点回归：行号对齐（不 trim、不过滤空行）
 */
import { describe, it, expect } from 'vitest'
import { analyzeLine, analyzeText } from '../src/core/toneAnalyzer'

describe('analyzeLine', () => {
  it('逐字输出 {char, tone, isMulti} 结构', () => {
    const result = analyzeLine('春风又绿')
    expect(result).toHaveLength(4)
    result.forEach(item => {
      expect(typeof item.char).toBe('string')
      expect(typeof item.tone).toBe('string')
      expect(typeof item.isMulti).toBe('boolean')
    })
  })

  it('空白字符标记为 skip，不丢弃', () => {
    const result = analyzeLine('春 风')
    expect(result).toHaveLength(3)
    expect(result[1].tone).toBe('skip')
    expect(result[1].char).toBe(' ')
  })

  it('标点标记为 punct，不参与比对', () => {
    const result = analyzeLine('春风，')
    expect(result).toHaveLength(3)
    expect(result[2].tone).toBe('punct')
    expect(result[2].char).toBe('，')
  })

  it('字典未收录的字标记为 ?', () => {
    const result = analyzeLine('龘')
    expect(result[0].tone).toBe('?')
    expect(result[0].isMulti).toBe(false)
  })

  it('多音字标记 isMulti = true（"多"/"多音" 归一化为 "多音"）', () => {
    const result = analyzeLine('中')  // tones.json 中 "中" 标为 "多"
    expect(result[0].isMulti).toBe(true)
    expect(result[0].tone).toBe('多音')
  })
})

describe('analyzeText（行号对齐回归）', () => {
  it('保留空行：结果行号与输入行号一一对应', () => {
    const result = analyzeText('春\n\n风')
    expect(result).toHaveLength(3)
    expect(result[1]).toEqual([])     // 空行 → 空结果，而非被过滤
    expect(result[2][0].char).toBe('风')
  })

  it('不 trim 行首空白：空格仍在结果中且位置正确', () => {
    const result = analyzeText('  春')
    expect(result[0]).toHaveLength(3)
    expect(result[0][0].tone).toBe('skip')
    expect(result[0][2].char).toBe('春')
  })

  it('尾部换行产生与 split 一致的空尾行', () => {
    const result = analyzeText('春\n')
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual([])
  })

  it('空输入返回空数组', () => {
    expect(analyzeText('')).toEqual([])
    expect(analyzeText(null)).toEqual([])
  })
})
