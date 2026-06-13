require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')

const cipaiRoutes = require('./routes/cipai')
const authRoutes = require('./routes/auth')

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api', authRoutes)
app.use('/api', cipaiRoutes)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ code: 0, data: { status: 'ok', time: new Date().toISOString() } })
})

// 404
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: 'Not Found' })
})

// 全局错误处理
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err)
  res.status(500).json({ code: 500, message: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[poetry-server] 启动成功，端口: ${PORT}`)
  console.log(`[poetry-server] API 地址: http://localhost:${PORT}/api`)
})

module.exports = app
