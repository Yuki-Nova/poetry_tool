/**
 * SQLite 词牌数据库操作层
 * 自动建库建表，封装所有 CRUD 操作
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// 确保 data 目录存在
const DATA_DIR = path.join(__dirname, '..', 'data')
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const DB_PATH = path.join(DATA_DIR, 'cipai.db')
const db = new Database(DB_PATH)

// 启用 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 建表（不存在则创建）
db.exec(`
  CREATE TABLE IF NOT EXISTS cipai (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    alias       TEXT NOT NULL DEFAULT '[]',
    charCount   INTEGER NOT NULL DEFAULT 0,
    sentences   TEXT NOT NULL DEFAULT '[]',
    formats     TEXT NOT NULL DEFAULT '[]',
    notes       TEXT NOT NULL DEFAULT '',
    examples    TEXT NOT NULL DEFAULT '[]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`)

// 存量库兼容：formats 列不存在则补列（ALTER TABLE）
const cols = db.prepare("PRAGMA table_info(cipai)").all().map(c => c.name)
if (!cols.includes('formats')) {
  db.exec("ALTER TABLE cipai ADD COLUMN formats TEXT NOT NULL DEFAULT '[]'")
  console.log('[models/cipai] 已为存量库补充 formats 列')
}
if (!cols.includes('examples')) {
  db.exec("ALTER TABLE cipai ADD COLUMN examples TEXT NOT NULL DEFAULT '[]'")
  console.log('[models/cipai] 已为存量库补充 examples 列')
}

console.log('[models/cipai] 数据库已初始化:', DB_PATH)

// ── 辅助：将数据库行转为 JS 对象 ──
function rowToCipai(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    alias: JSON.parse(row.alias),
    charCount: row.charCount,
    sentences: JSON.parse(row.sentences),
    formats: row.formats ? JSON.parse(row.formats) : [],
    notes: row.notes,
    examples: row.examples ? JSON.parse(row.examples) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * 归一化 formats：
 * - 请求未传 formats（admin 场景）→ 单格式 [{label:'定格', sentences}]
 * - 请求已传 formats → 原样保留
 */
function normalizeFormats(cipai) {
  if (Array.isArray(cipai.formats) && cipai.formats.length > 0) return cipai.formats
  return [{ label: '定格', planSegments: 1, sentences: cipai.sentences || [] }]
}

// ── CRUD 方法 ──

/**
 * 查询词牌列表，支持搜索
 * @param {string} [search] - 模糊搜索词（匹配 name / id / alias）
 * @returns {object[]}
 */
function list(search) {
  let sql = 'SELECT * FROM cipai'
  const params = []

  if (search && search.trim()) {
    sql += ' WHERE name LIKE ? OR id LIKE ? OR alias LIKE ?'
    const q = `%${search.trim()}%`
    params.push(q, q, q)
  }

  sql += ' ORDER BY name ASC'
  return db.prepare(sql).all(...params).map(rowToCipai)
}

/**
 * 按 id 获取单条词牌
 * @param {string} id
 * @returns {object|null}
 */
function getById(id) {
  const row = db.prepare('SELECT * FROM cipai WHERE id = ?').get(id)
  return rowToCipai(row)
}

/**
 * 新建词牌
 * @param {object} cipai - 完整的词牌对象
 * @returns {object} 插入后的词牌对象
 */
function create(cipai) {
  const formats = normalizeFormats(cipai)
  const stmt = db.prepare(`
    INSERT INTO cipai (id, name, alias, charCount, sentences, formats, notes, examples)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    cipai.id,
    cipai.name,
    JSON.stringify(cipai.alias || []),
    cipai.charCount,
    JSON.stringify(cipai.sentences),
    JSON.stringify(formats),
    cipai.notes || '',
    JSON.stringify(cipai.examples || [])
  )

  return getById(cipai.id)
}

/**
 * 更新词牌
 * @param {string} id
 * @param {object} cipai - 要更新的字段
 * @returns {object|null}
 */
function update(id, cipai) {
  const existing = getById(id)
  if (!existing) return null

  const newSentences = cipai.sentences ?? existing.sentences
  let formats = null
  if (Array.isArray(cipai.formats) && cipai.formats.length > 0) {
    // 请求显式传了 formats → 全量覆盖
    formats = cipai.formats
  } else {
    // 请求未传 formats（admin 场景）→ 保留原 formats，但同步 formats[0] = 主格式
    // 保证「顶层 sentences 是主格式权威」这一原则下两份数据不脱节
    formats = existing.formats && existing.formats.length > 0
      ? existing.formats.map((f, i) => i === 0 ? { ...f, sentences: newSentences } : f)
      : [{ label: '定格', planSegments: 1, sentences: newSentences }]
  }

  const stmt = db.prepare(`
    UPDATE cipai
    SET name = ?,
        alias = ?,
        charCount = ?,
        sentences = ?,
        formats = ?,
        notes = ?,
        examples = ?,
        updated_at = datetime('now','localtime')
    WHERE id = ?
  `)

  stmt.run(
    cipai.name ?? existing.name,
    JSON.stringify(cipai.alias ?? existing.alias),
    cipai.charCount ?? existing.charCount,
    JSON.stringify(newSentences),
    JSON.stringify(formats),
    cipai.notes ?? existing.notes,
    JSON.stringify(cipai.examples ?? existing.examples),
    id
  )

  return getById(id)
}

/**
 * 删除词牌
 * @param {string} id
 * @returns {boolean} 是否成功删除
 */
function remove(id) {
  const result = db.prepare('DELETE FROM cipai WHERE id = ?').run(id)
  return result.changes > 0
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove
}
