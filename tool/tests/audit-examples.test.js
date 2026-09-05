/**
 * audit-examples.test.js — 例词反测审计（疑点生成器，不是硬门禁）
 *
 * 原理：例词是权威词作，必须符合词牌格律。用 tool/core 的 toneAnalyzer +
 * patternMatcher 对每个词牌的主格式（formats[0] ?? sentences）跑其全部例词，
 * 失配即疑点。
 *
 * 定位：报告 → 人工裁决 → 确证项写入 longyusheng_crawler/corrections.json。
 * 不设疑点数阈值（不 fail 测试），只保证报告可生成、可复现（输出文件进 git）。
 *
 * 数据源：tool/public/cipai.json（export-static.py 产物，{code:0, data:[...]} 包裹）
 * —— 即最终进前端的同一份数据。运行前先执行：
 *   cd longyusheng_crawler && python export-static.py
 *
 * 已知假阳性源（设计使然，勿当 bug）：
 *  - 例词含校勘注（「一本下有…二字」「一作…」）非标点无法剥离 → 切分错位
 *  - 多音字/异体字 → matchPattern 标 multi-tone / unknown，不计疑点
 *  - 多格式词牌的例词可能对应非主格式
 *  - 韵书表收录不全 → tone 为 '?'（unknown，不计）
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { analyzeLine } from '../src/core/toneAnalyzer'
import { matchPattern } from '../src/core/patternMatcher'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_PATH = path.join(__dirname, '..', 'public', 'cipai.json')
const REPORT_PATH = path.join(
  __dirname, '..', '..', 'longyusheng_crawler', 'output', 'audit-examples-report.json'
)

/** 清洗：仅保留正文汉字（去标点/空白/引号等），校勘注刻意保留（假阳性源） */
function stripPunct(text) {
  return text.replace(/[\s，。！？、；：""''「」《》（）…—\-—,.;:!?()"'']/g, '')
}

/**
 * 对单个例词做格律匹配
 * @returns {{status: string, issues: {line:number,col:number,char:string,status:string}[],
 *            cleanLen:number, tplLen:number}}
 */
function auditExample(cipai, example) {
  const tpl = cipai.formats?.[0]?.sentences ?? cipai.sentences
  const clean = stripPunct(example.text || '')
  const tplLen = (tpl || []).reduce((acc, s) => acc + (s.length || 0), 0)

  if (!tpl || tpl.length === 0) {
    return { status: 'no-template', issues: [], cleanLen: clean.length, tplLen: 0 }
  }
  if (clean.length !== tplLen) {
    // 长度不符（校勘注/脱字/连排断句问题）——本身即疑点，跳过细匹配
    return { status: 'length-mismatch', issues: [], cleanLen: clean.length, tplLen }
  }

  // 按模板每句 length 贪心切分（例词是连排无换行，不能按标点切——顿号/感叹号会切碎）
  const lines = []
  let pos = 0
  for (const s of tpl) {
    lines.push(clean.slice(pos, pos + s.length))
    pos += s.length
  }

  const lineResults = lines.map(line => analyzeLine(line, 'cilin'))
  const matched = matchPattern(lineResults, tpl, 'cilin')

  const issues = []
  matched.forEach((lineArr, li) => {
    lineArr.forEach((item, ci) => {
      if (item.status === 'tone-error' || item.status === 'rhyme-warn') {
        issues.push({ line: li, col: ci, char: item.char, status: item.status })
      }
    })
  })

  return { status: issues.length ? 'tone-issues' : 'ok', issues, cleanLen: clean.length, tplLen }
}

/** 生成完整疑点报告并落盘（git 跟踪，便于 diff） */
function buildReport(cipaiList) {
  const summary = { total: 0, ok: 0, toneIssues: 0, lengthMismatch: 0, noTemplate: 0 }
  const items = []

  cipaiList.forEach(cipai => {
    const examples = cipai.examples || []
    examples.forEach((ex, ei) => {
      summary.total += 1
      const r = auditExample(cipai, ex)
      if (r.status === 'ok') summary.ok += 1
      else if (r.status === 'tone-issues') summary.toneIssues += 1
      else if (r.status === 'length-mismatch') summary.lengthMismatch += 1
      else summary.noTemplate += 1

      if (r.status !== 'ok') {
        items.push({
          cipaiId: cipai.id,
          cipaiName: cipai.name,
          exampleIndex: ei,
          author: ex.author || '',
          status: r.status,
          cleanLen: r.cleanLen,
          tplLen: r.tplLen,
          issues: r.issues.slice(0, 10), // 单条例词最多记 10 处，防报告爆炸
        })
      }
    })
  })

  const report = {
    generatedAt: new Date().toISOString(),
    engine: 'tool/src/core/toneAnalyzer + patternMatcher (vitest)',
    dataSource: 'tool/public/cipai.json (export-static.py)',
    summary,
    items,
  }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8')
  return report
}

describe('例词反测（疑点生成器）', () => {
  it('数据源存在且形状正确（依赖 export-static.py 产物）', () => {
    expect(fs.existsSync(DATA_PATH), `未找到 ${DATA_PATH}，请先运行 python export-static.py`).toBe(true)
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    expect(raw.code).toBe(0)
    expect(Array.isArray(raw.data)).toBe(true)
    expect(raw.data.length).toBeGreaterThan(0)
  })

  it('生成疑点报告并落盘（不设疑点数阈值，交人工裁决）', () => {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    const report = buildReport(raw.data)

    console.log(`[audit-examples] 共 ${report.summary.total} 条例词: ` +
      `ok=${report.summary.ok} 出律=${report.summary.toneIssues} ` +
      `长度不符=${report.summary.lengthMismatch} 无模板=${report.summary.noTemplate}`)

    expect(fs.existsSync(REPORT_PATH)).toBe(true)
    expect(report.summary.total).toBeGreaterThan(0)

    // 输出疑点样例（便于直接查看）
    report.items.slice(0, 5).forEach(it => {
      console.log(`  ⚠ ${it.cipaiName}（${it.author || '?'}）${it.status}` +
        (it.issues.length ? ` 例: ${it.issues[0].char}@${it.issues[0].line}:${it.issues[0].col}` : ''))
    })
  })

  it('长度不符的例词在报告中携带 cleanLen/tplLen（校勘注是预期假阳性源）', () => {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'))
    const report = buildReport(raw.data)
    const lm = report.items.filter(it => it.status === 'length-mismatch')
    lm.slice(0, 3).forEach(it => {
      expect(typeof it.cleanLen).toBe('number')
      expect(typeof it.tplLen).toBe('number')
      expect(it.cleanLen).not.toBe(it.tplLen)
    })
  })
})
