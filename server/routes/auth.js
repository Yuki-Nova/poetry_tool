/**
 * 认证路由
 * POST /api/login — 验证密码，签发 JWT
 */

const express = require('express')
const jwt = require('jsonwebtoken')
const { getSecret } = require('../middleware/auth')

const router = express.Router()

function getPassword() {
  const pwd = process.env.ADMIN_PASSWORD
  if (!pwd) {
    throw new Error('未设置环境变量 ADMIN_PASSWORD')
  }
  return pwd
}

// POST /api/login
router.post('/login', (req, res) => {
  try {
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ code: 400, message: '请输入密码' })
    }

    if (password !== getPassword()) {
      return res.status(401).json({ code: 401, message: '密码错误' })
    }

    // 签发 JWT，有效期 7 天
    const token = jwt.sign(
      { role: 'admin', iat: Math.floor(Date.now() / 1000) },
      getSecret(),
      { expiresIn: '7d' }
    )

    res.json({
      code: 0,
      data: { token },
      message: '登录成功'
    })
  } catch (err) {
    console.error('[auth login]', err.message)
    res.status(500).json({ code: 500, message: '服务器配置错误' })
  }
})

module.exports = router
