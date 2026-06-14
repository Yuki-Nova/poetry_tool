/**
 * 数据迁移脚本
 * 将 chinese_word_rhyme-main 仓库数据转换为 tool/src/data/ 格式
 *
 * 输入：chinese_word_rhyme-main/data/
 * 输出：tool/src/data/
 *
 * 用法：node scripts/migrate-data.js
 */

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'chinese_word_rhyme-main', 'data')
const DST = path.join(__dirname, '..', 'tool', 'src', 'data')

// ============================================================
// 1. 平仄字典：直接复制 Word_Tune.json → tones.json
// ============================================================
function migrateTones() {
  const src = require(path.join(SRC, 'Word_Tune.json'))
  fs.writeFileSync(
    path.join(DST, 'tones.json'),
    JSON.stringify(src, null, 2),
    'utf8'
  )
  const count = Object.keys(src).length
  console.log(`[tones] ${count} 字 → tones.json`)
}

// ============================================================
// 2. 韵书转换：统一为 { name, groups: [{ name, chars }] }
// ============================================================

/**
 * 中华新韵：{ "一麻": { "平": [...], "仄": [...] } }
 * → { name: "中华新韵", groups: [{ name: "一麻(平)", chars }, { name: "一麻(仄)", chars }] }
 *  或合并平仄：{ name: "一麻", chars: [...平..., ...仄...] }
 */
function migrateXinyun() {
  const src = require(path.join(SRC, 'Xinyun_Rhyme.json'))
  const groups = []

  for (const [groupName, tones] of Object.entries(src)) {
    const chars = []
    if (tones.平) chars.push(...tones.平)
    if (tones.仄) chars.push(...tones.仄)
    groups.push({ name: groupName, chars: [...new Set(chars)] })
  }

  const output = { name: '中华新韵', groups }
  fs.writeFileSync(
    path.join(DST, 'rhymes', 'xinyun.json'),
    JSON.stringify(output, null, 2),
    'utf8'
  )
  console.log(`[xinyun] ${groups.length} 韵部 → rhymes/xinyun.json`)
}

/**
 * 平水韵：{ "上平声部": { "一东": [...], "二冬": [...] }, "下平声部": {...}, ... }
 * → { name: "平水韵", groups: [{ name: "一东", chars }, { name: "二冬", chars }] }
 */
function migratePingshui() {
  const src = require(path.join(SRC, 'Pingshui_Rhyme.json'))
  const groups = []

  for (const [shengBu, yunBus] of Object.entries(src)) {
    for (const [yunName, chars] of Object.entries(yunBus)) {
      groups.push({ name: yunName, chars })
    }
  }

  const output = { name: '平水韵', groups }
  fs.writeFileSync(
    path.join(DST, 'rhymes', 'pingshui.json'),
    JSON.stringify(output, null, 2),
    'utf8'
  )
  console.log(`[pingshui] ${groups.length} 韵部 → rhymes/pingshui.json`)
}

/**
 * 词林正韵：{ "第一部": { "平声": [...], "仄声": [...] }, ... }
 * → { name: "词林正韵", groups: [{ name: "第一部", chars }, ...] }
 */
function migrateCilin() {
  const src = require(path.join(SRC, 'Cilin_Rhyme.json'))
  const groups = []

  for (const [yunName, tones] of Object.entries(src)) {
    const chars = []
    if (tones.平声) chars.push(...tones.平声)
    if (tones.仄声) chars.push(...tones.仄声)
    if (tones.入声) chars.push(...tones.入声)
    groups.push({ name: yunName, chars: [...new Set(chars)] })
  }

  const output = { name: '词林正韵', groups }
  fs.writeFileSync(
    path.join(DST, 'rhymes', 'cilin.json'),
    JSON.stringify(output, null, 2),
    'utf8'
  )
  console.log(`[cilin] ${groups.length} 韵部 → rhymes/cilin.json`)
}

// ============================================================
// 执行
// ============================================================
console.log('=== 数据迁移开始 ===\n')
migrateTones()
migrateXinyun()
migratePingshui()
migrateCilin()
console.log('\n=== 数据迁移完成 ===')
