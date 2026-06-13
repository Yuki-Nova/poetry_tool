/**
 * 词牌 CRUD 路由
 *
 * GET    /api/cipai         — 列表（?search=xxx 模糊搜索）
 * GET    /api/cipai/:id     — 单条详情
 * POST   /api/cipai         — 新增（需鉴权）
 * PUT    /api/cipai/:id     — 修改（需鉴权）
 * DELETE /api/cipai/:id     — 删除（需鉴权）
 */

const express = require('express')
const router = express.Router()
const cipaiModel = require('../models/cipai')
const { validateCipai } = require('../../shared/cipaiSchema')
const { authMiddleware } = require('../middleware/auth')

// ── 公开接口 ──

// GET /api/cipai — 获取词牌列表
router.get('/cipai', (req, res) => {
  try {
    const { search } = req.query
    const list = cipaiModel.list(search)
    res.json({ code: 0, data: list })
  } catch (err) {
    console.error('[cipai list]', err)
    res.status(500).json({ code: 500, message: '获取词牌列表失败' })
  }
})

// GET /api/cipai/:id — 获取单条词牌
router.get('/cipai/:id', (req, res) => {
  try {
    const cipai = cipaiModel.getById(req.params.id)
    if (!cipai) {
      return res.status(404).json({ code: 404, message: '词牌不存在' })
    }
    res.json({ code: 0, data: cipai })
  } catch (err) {
    console.error('[cipai get]', err)
    res.status(500).json({ code: 500, message: '获取词牌详情失败' })
  }
})

// ── 需鉴权接口 ──

// POST /api/cipai — 新增词牌
router.post('/cipai', authMiddleware, (req, res) => {
  try {
    const cipai = req.body

    // 校验数据
    const { valid, errors } = validateCipai(cipai)
    if (!valid) {
      return res.status(400).json({ code: 400, message: '数据校验失败', errors })
    }

    // 检查 id 是否已存在
    const existing = cipaiModel.getById(cipai.id)
    if (existing) {
      return res.status(409).json({ code: 409, message: `词牌 id "${cipai.id}" 已存在` })
    }

    const created = cipaiModel.create(cipai)
    res.status(201).json({ code: 0, data: created, message: '创建成功' })
  } catch (err) {
    console.error('[cipai create]', err)
    res.status(500).json({ code: 500, message: '创建词牌失败' })
  }
})

// PUT /api/cipai/:id — 修改词牌
router.put('/cipai/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const cipai = req.body

    // 基本校验
    const { valid, errors } = validateCipai(cipai)
    if (!valid) {
      return res.status(400).json({ code: 400, message: '数据校验失败', errors })
    }

    const updated = cipaiModel.update(id, cipai)
    if (!updated) {
      return res.status(404).json({ code: 404, message: '词牌不存在' })
    }

    res.json({ code: 0, data: updated, message: '更新成功' })
  } catch (err) {
    console.error('[cipai update]', err)
    res.status(500).json({ code: 500, message: '更新词牌失败' })
  }
})

// DELETE /api/cipai/:id — 删除词牌
router.delete('/cipai/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params
    const success = cipaiModel.remove(id)
    if (!success) {
      return res.status(404).json({ code: 404, message: '词牌不存在' })
    }
    res.json({ code: 0, message: '删除成功' })
  } catch (err) {
    console.error('[cipai delete]', err)
    res.status(500).json({ code: 500, message: '删除词牌失败' })
  }
})

module.exports = router
