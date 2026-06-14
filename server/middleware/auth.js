/**
 * JWT 鉴权中间件
 * 校验请求头 Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken')

if (!process.env.JWT_SECRET) {
  throw new Error('未设置环境变量 JWT_SECRET，请创建 server/.env 文件并设置 JWT_SECRET=随机字符串')
}
const JWT_SECRET = process.env.JWT_SECRET

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ code: 401, message: '令牌无效或已过期' })
  }
}

module.exports = { authMiddleware, JWT_SECRET }
