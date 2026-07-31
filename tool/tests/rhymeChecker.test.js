/**
 * rhymeChecker 单元测试
 * 重点回归：韵脚字携带真实行号，出韵错误可正确定位
 */
import { describe, it, expect } from 'vitest'
import {
  getRhymeGroup,
  checkRhyme,
  extractRhymeChars,
  defaultRhymeBook
} from '../src/core/rhymeChecker'
import custom from '../src/data/custom.json'

// 中华新韵（14 部）: 家/花 → 一麻；山/关/天/间 → 八寒
const foot = (char, line) => ({ char, line })

describe('getRhymeGroup', () => {
  it('返回字所属韵部', () => {
    expect(getRhymeGroup('家', 'xinyun')).toBe('一麻')
    expect(getRhymeGroup('山', 'xinyun')).toBe('八寒')
  })

  it('未收录返回 null', () => {
    expect(getRhymeGroup('龘', 'xinyun')).toBe(null)
  })

  it('custom 覆写优先于主数据', () => {
    const override = custom.rhymes?.cilin?.['国']
    if (override) {
      expect(getRhymeGroup('国', 'cilin')).toBe(override)
    }
  })
})

describe('checkRhyme', () => {
  it('同韵部的韵脚判定为押韵', () => {
    const result = checkRhyme([foot('家', 1), foot('花', 3)], 'xinyun')
    expect(result.valid).toBe(true)
    expect(result.group).toBe('一麻')
    expect(result.errors).toEqual([])
  })

  it('出韵的字出现在 errors 中，且 line 为真实行号（回归）', () => {
    // 韵脚行是第 1、3 行，第 3 行（山，八寒）与基准（家，一麻）不同韵
    const result = checkRhyme([foot('家', 1), foot('山', 3)], 'xinyun')
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatchObject({ char: '山', line: 3, group: '八寒' })
    // 关键回归：line 是诗行号 3，而不是韵脚数组下标 1
    expect(result.errors[0].line).not.toBe(1)
  })

  it('未收录的韵脚字作为错误报告，保留行号', () => {
    const result = checkRhyme([foot('家', 1), foot('龘', 3)], 'xinyun')
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatchObject({ char: '龘', line: 3, group: null })
  })

  it('所有韵脚字均未收录时给出 neighborWarning', () => {
    const result = checkRhyme([foot('龘', 0), foot('齉', 1)], 'xinyun')
    expect(result.valid).toBe(false)
    expect(result.neighborWarning).toBe('所有韵脚字均未被该韵书收录')
    expect(result.errors).toHaveLength(2)
  })

  it('不足两个韵脚时不报错', () => {
    const one = checkRhyme([foot('家', 1)], 'xinyun')
    expect(one.valid).toBe(true)
    expect(one.errors).toEqual([])
  })
})

describe('extractRhymeChars', () => {
  const line = (chars) => chars.map(char => ({ char, tone: '平', isMulti: false }))

  it('按模板提取韵脚字及真实行号', () => {
    const lineResults = [
      line(['春', '风']),
      line(['家', '花']),
      line(['江', '南']),
      line(['天', '涯'])
    ]
    const sentenceMetas = [
      { isRhyme: false }, { isRhyme: true }, { isRhyme: false }, { isRhyme: true }
    ]
    const chars = extractRhymeChars(lineResults, sentenceMetas)
    expect(chars).toEqual([
      { char: '花', line: 1 },
      { char: '涯', line: 3 }
    ])
  })

  it('韵脚行末为标点时跳过该行（不提取）', () => {
    const lineResults = [[{ char: '。', tone: 'punct', isMulti: false }]]
    const sentenceMetas = [{ isRhyme: true }]
    expect(extractRhymeChars(lineResults, sentenceMetas)).toEqual([])
  })
})

describe('defaultRhymeBook', () => {
  it('诗体默认中华新韵，词牌默认词林正韵', () => {
    expect(defaultRhymeBook('绝句')).toBe('xinyun')
    expect(defaultRhymeBook('律诗')).toBe('xinyun')
    expect(defaultRhymeBook('词牌')).toBe('cilin')
    expect(defaultRhymeBook()).toBe('xinyun')
  })
})
