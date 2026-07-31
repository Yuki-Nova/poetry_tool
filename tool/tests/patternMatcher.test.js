/**
 * patternMatcher 单元测试
 * 重点回归：
 *  - 韵脚按 rhymeType（平韵/仄韵）判定，而非硬编码平声
 *  - 出韵错误使用真实行号
 *  - rhymeGroup 随匹配结果直接生成
 */
import { describe, it, expect } from 'vitest'
import { matchPattern, collectErrors } from '../src/core/patternMatcher'
import { checkRhyme } from '../src/core/rhymeChecker'

// 构造手写分析结果，避免测试依赖 tones.json 的具体内容
const line = (tones) => tones.map((tone, i) => ({ char: `字${i}`, tone, isMulti: false }))

// 五绝仄起式模板：第 1、3 句为韵脚句（平韵）
const wujueTemplate = [
  { index: 0, length: 5, pattern: ['仄', '仄', '平', '平', '仄'], isRhyme: false, rhymeType: null },
  { index: 1, length: 5, pattern: ['平', '平', '仄', '仄', '平'], isRhyme: true, rhymeType: '平韵' },
  { index: 2, length: 5, pattern: ['平', '平', '平', '仄', '仄'], isRhyme: false, rhymeType: null },
  { index: 3, length: 5, pattern: ['仄', '仄', '仄', '平', '平'], isRhyme: true, rhymeType: '平韵' }
]

describe('matchPattern 基本匹配', () => {
  it('全对时所有字 status 为 ok', () => {
    const result = matchPattern([
      line(['仄', '仄', '平', '平', '仄']),
      line(['平', '平', '仄', '仄', '平']),
      line(['平', '平', '平', '仄', '仄']),
      line(['仄', '仄', '仄', '平', '平'])
    ], wujueTemplate)
    result.flat().forEach(item => expect(item.status).toBe('ok'))
  })

  it('出律的字标记 tone-error', () => {
    const result = matchPattern([line(['平', '仄', '平', '平', '仄'])], [wujueTemplate[0]])
    expect(result[0][0].status).toBe('tone-error')
  })

  it('可平可仄位置任何声调都算对', () => {
    const tpl = [{ pattern: ['可平可仄'], isRhyme: false, rhymeType: null }]
    expect(matchPattern([line(['平'])], tpl)[0][0].status).toBe('ok')
    expect(matchPattern([line(['仄'])], tpl)[0][0].status).toBe('ok')
  })

  it('多音字标记 multi-tone 且不视为出律', () => {
    const result = matchPattern([line(['多'])], [wujueTemplate[0]])
    expect(result[0][0].status).toBe('multi-tone')
  })

  it('字典未收录标记 unknown', () => {
    const result = matchPattern([line(['?'])], [wujueTemplate[0]])
    expect(result[0][0].status).toBe('unknown')
  })

  it('超出模板的行全部标记 unknown', () => {
    const result = matchPattern([line(['平'])], [])
    expect(result[0][0].status).toBe('unknown')
    expect(result[0][0].expected).toBe('?')
  })
})

describe('韵脚按 rhymeType 判定（回归）', () => {
  const footTemplate = (rhymeType) => [
    { index: 0, length: 2, pattern: ['平', '韵脚'], isRhyme: true, rhymeType }
  ]

  it('平韵：仄声韵脚标记 rhyme-warn', () => {
    const result = matchPattern([line(['平', '仄'])], footTemplate('平韵'))
    expect(result[0][1].status).toBe('rhyme-warn')
  })

  it('仄韵：仄声韵脚为 ok-rhyme，平声为 rhyme-warn（回归 #3）', () => {
    const ok = matchPattern([line(['平', '仄'])], footTemplate('仄韵'))
    expect(ok[0][1].status).toBe('ok-rhyme')

    const bad = matchPattern([line(['平', '平'])], footTemplate('仄韵'))
    expect(bad[0][1].status).toBe('rhyme-warn')
  })

  it('韵脚 可平可仄：任何声调都算对', () => {
    const tpl = footTemplate('可平可仄')
    expect(matchPattern([line(['平', '平'])], tpl)[0][1].status).toBe('ok')
    expect(matchPattern([line(['平', '仄'])], tpl)[0][1].status).toBe('ok')
  })

  it('韵脚字回填 rhymeGroup（随匹配结果生成）', () => {
    // 注意：rhymeGroup 需要真实汉字（char 字段），line() 辅助函数只生成字形
    const realLine = [
      { char: '春', tone: '平', isMulti: false },
      { char: '家', tone: '平', isMulti: false }
    ]
    const result = matchPattern([realLine], footTemplate('平韵'), 'xinyun')
    expect(result[0][1].rhymeGroup).toBe('一麻')
    expect(result[0][0].rhymeGroup).toBe(null)  // 非韵脚位不回填
  })
})

describe('collectErrors', () => {
  it('出律错误带正确的行列号', () => {
    const matched = matchPattern([line(['平', '仄', '平'])], [{ pattern: ['仄', '仄', '平'], isRhyme: false, rhymeType: null }])
    const errors = collectErrors(matched, { errors: [] })
    expect(errors).toEqual([
      expect.objectContaining({ line: 0, col: 0, type: 'tone' })
    ])
  })

  it('出韵错误使用 checkRhyme 返回的真实行号（回归 #1）', () => {
    const matched = matchPattern([
      line(['仄', '仄', '平', '平', '仄']),
      line(['平', '平', '仄', '仄', '家']),   // 行 1：一麻
      line(['平', '平', '平', '仄', '仄']),
      line(['仄', '仄', '仄', '平', '山'])    // 行 3：八寒，出韵
    ], wujueTemplate, 'xinyun')

    const rhyme = checkRhyme([
      { char: '家', line: 1 },
      { char: '山', line: 3 }
    ], 'xinyun')

    const errors = collectErrors(matched, rhyme)
    const rhymeErrors = errors.filter(e => e.type === 'rhyme')
    expect(rhymeErrors).toHaveLength(1)
    expect(rhymeErrors[0].line).toBe(3)
    expect(rhymeErrors[0].char).toBe('山')
  })

  it('空模板错误列表为空', () => {
    expect(collectErrors([], { errors: [] })).toEqual([])
  })
})
