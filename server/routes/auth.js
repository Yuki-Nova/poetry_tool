/**
 * 认证路由
 * POST /api/login — 验证密码，签发 JWT
 */

const express = require('express')
const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../middleware/auth')

const router = express.Router()

// 管理员密码，必须从环境变量读取
if (!process.env.ADMIN_PASSWORD) {
  throw new Error('未设置环境变量 ADMIN_PASSWORD，请创建 server/.env 文件并设置 ADMIN_PASSWORD=你的密码')
}
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

// POST /api/login
router.post('/login', (req, res) => {
  const { password } = req.body

  if (!password) {
    return res.status(400).json({ code: 400, message: '请输入密码' })
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ code: 401, message: '密码错误' })
  }

  // 签发 JWT，有效期 7 天
  const token = jwt.sign(
    { role: 'admin', iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '7d' }
  )

  res.json({
    code: 0,
    data: { token },
    message: '登录成功'
  })
})

module.exports = router
