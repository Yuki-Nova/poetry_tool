/**
 * 词牌批量导入脚本
 * 解析 Ci_Tunes.json → 转为 cipai schema → 调用 API 录入
 *
 * 用法：
 *   先确保 server 在运行（pm2 start 或 node app.js）
 *   然后：node scripts/import-cipai.js [--dry]
 *
 *   --dry  试运行，只打印不实际发送
 */

const https = require('https')
const http = require('http')

// ========== 配置 ==========
const API_HOST = process.env.API_HOST || 'localhost'
const API_PORT = process.env.API_PORT || 3001
const API_PASS = process.env.API_PASS
if (!DRY_RUN && !API_PASS) {
  console.error('请设置环境变量 API_PASS=你的管理密码 后运行')
  process.exit(1)
}
const DRY_RUN = process.argv.includes('--dry')

// ========== 加载数据 ==========
console.log('加载 Ci_Tunes.json ...')
const ciTunes = require('../chinese_word_rhyme-main/data/Ci_Tunes.json')
const ciCatalog = require('../chinese_word_rhyme-main/data/Ci_Catalog.json')
const names = Object.keys(ciTunes)
console.log(`共 ${names.length} 个词牌`)

// ========== 韵脚符号映射 ==========
// "句" / "韵" / "叶" / "叠" = 句子结束（"韵"/"叶"/"叠"同时也是押韵标记）
// "读" = 句中停顿，不拆句
const SENTENCE_END_MARKERS = new Set(['句', '韵', '叶', '叠'])
const RHYME_MARKERS = new Set(['韵', '叶', '叠'])

// ========== 登录获取 token ==========
let token = null

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const mod = API_HOST === 'localhost' || API_HOST === '127.0.0.1' ? http : https
    const opts = {
      hostname: API_HOST, port: API_PORT, path, method,
      headers: { 'Content-Type': 'application/json' }
    }
    if (token) opts.headers['Authorization'] = `Bearer ${token}`

    const req = mod.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function login() {
  if (DRY_RUN) { token = 'dry-run'; return }
  const res = await request('POST', '/api/login', { password: API_PASS })
  if (res.body?.data?.token) {
    token = res.body.data.token
    console.log('登录成功')
  } else {
    throw new Error('登录失败: ' + JSON.stringify(res.body))
  }
}

// ========== 转换逻辑 ==========

/**
 * 将 Ci_Tunes 的一个 format 转为我们的 sentences 数组
 */
function convertFormat(tunes) {
  const sentences = []
  let currentPattern = []

  for (let i = 0; i < tunes.length; i++) {
    const t = tunes[i]
    const tuneVal = t.tune

    // 跳过非平仄标记（有些标记如 ○ ● ⊙ 等）
    if (tuneVal === '平' || tuneVal === '仄' || tuneVal === '中') {
      currentPattern.push(tuneVal === '中' ? '可平可仄' : tuneVal)
    }

    // 遇到句子结束标记 → 结束当前句
    const rhythm = t.rhythm
    const isEnd = rhythm && SENTENCE_END_MARKERS.has(rhythm)
    const isLast = i === tunes.length - 1

    if (isEnd || isLast) {
      if (currentPattern.length > 0) {
        const isRhyme = rhythm ? RHYME_MARKERS.has(rhythm) : false
        sentences.push({
          index: sentences.length,
          length: currentPattern.length,
          pattern: [...currentPattern],
          isRhyme,
          rhymeType: isRhyme ? inferRhymeType(currentPattern, tunes, i) : null
        })
        currentPattern = []
      }
    }
  }

  return sentences
}

/** 从句尾推断韵脚类型 */
function inferRhymeType(pattern, tunes, endIdx) {
  const lastTones = pattern.slice(-2)
  const last = lastTones[lastTones.length - 1]
  if (last === '平') return '平韵'
  if (last === '仄') return '仄韵'
  return '可平可仄'
}

// 中文 → 拼音 ID 映射（常见词牌名预定义）
const NAME_TO_ID = {
  '竹枝': 'zhuzhi', '归字谣': 'guiziyao', '渔父引': 'yufuyin', '閒中好': 'xianzhonghao',
  '纥那曲': 'genaqu', '拜新月': 'baixinyue', '梧桐影': 'wutongying', '啰唝曲': 'luohongqu',
  '醉妆词': 'zuizhuangci', '庆宣和': 'qingxuanhe', '南歌子': 'nangezi', '回波乐': 'huiboyue',
  '舞马词': 'wumaci', '三台': 'santai', '柘枝引': 'zhezhiyin', '凭阑人': 'pinglanren',
  '摘得新': 'zhaidexin', '渔歌子': 'yugezi', '忆江南': 'yijiangnan', '潇湘神': 'xiaoxiangshen',
  '解红': 'jiehong', '赤枣子': 'chizaozi', '捣练子': 'daolianzi', '桂殿秋': 'guidianqiu',
  '满江红': 'manjianghong', '蝶恋花': 'dielianhua', '菩萨蛮': 'pusaman', '西江月': 'xijiangyue',
  '浣溪沙': 'huanxisha', '鹧鸪天': 'zhegutian', '念奴娇': 'niannujiao', '水调歌头': 'shuidiaogetou',
  '临江仙': 'linjiangxian', '虞美人': 'yumeiren', '如梦令': 'rumengling', '点绛唇': 'dianjiangchun',
  '清平乐': 'qingpingyue', '卜算子': 'busuanzi', '采桑子': 'caisangzi', '浪淘沙': 'langtaosha',
  '江城子': 'jiangchengzi', '沁园春': 'qinyuanchun', '永遇乐': 'yongyule', '雨霖铃': 'yulinling',
  '声声慢': 'shengshengman', '一剪梅': 'yijianmei', '定风波': 'dingfengbo', '渔家傲': 'yujiaao',
  '踏莎行': 'tasuoxing', '苏幕遮': 'sumuzhe', '破阵子': 'pozhenzi', '青玉案': 'qingyuanan',
}

/** 生成词牌 ID */
function toId(name) {
  if (NAME_TO_ID[name]) return NAME_TO_ID[name]
  // 回退：基于字符码的 hash
  let hash = 'ci'
  for (let i = 0; i < Math.min(name.length, 6); i++) {
    hash += name.charCodeAt(i).toString(36)
  }
  return hash.slice(0, 30)
}

/** 判断韵格类型 */
function guessRhymeType(sentences) {
  const rhymeSentences = sentences.filter(s => s.isRhyme)
  if (rhymeSentences.length === 0) return '平韵格'
  const types = rhymeSentences.map(s => s.rhymeType)
  const allPing = types.every(t => t === '平韵')
  const allZe = types.every(t => t === '仄韵')
  if (allPing) return '平韵格'
  if (allZe) return '仄韵格'
  return '平仄韵转换格'
}

// ========== 批量导入 ==========
async function importAll() {
  await login()

  let success = 0, skipped = 0, failed = 0
  const failedList = []

  for (let idx = 0; idx < names.length; idx++) {
    const name = names[idx]
    const data = ciTunes[name]
    const format = data.formats[0]  // 取第一个格式（最常用）

    if (!format || !format.tunes) {
      skipped++
      continue
    }

    const sentences = convertFormat(format.tunes)
    if (sentences.length === 0) {
      skipped++
      continue
    }

    const charCount = sentences.reduce((s, sent) => s + sent.length, 0)

    const cipai = {
      id: toId(name),
      name,
      alias: [],
      charCount,
      sentences,
      notes: (format.sketch || '') + (format.author ? ' · 作者：' + format.author : '')
    }

    if (DRY_RUN) {
      console.log(`[dry] ${name} (${charCount}字, ${sentences.length}句)`)
      success++
      if (idx >= 10) { console.log('...(dry run 只显示前 10 个)...'); break }
      continue
    }

    try {
      const res = await request('POST', '/api/cipai', cipai)
      if (res.status === 201 || res.status === 200) {
        success++
        if (success % 50 === 0) console.log(`  已导入 ${success}/${names.length}`)
      } else if (res.status === 409) {
        skipped++
      } else {
        failed++
        failedList.push({ name, status: res.status, body: res.body })
        console.error(`  ✗ ${name}: ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`)
      }
    } catch (err) {
      failed++
      failedList.push({ name, error: err.message })
      console.error(`  ✗ ${name}: ${err.message}`)
    }

    // 限速
    if (idx % 10 === 0) await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n=== 导入完成 ===`)
  console.log(`成功: ${success}`)
  console.log(`跳过: ${skipped}`)
  console.log(`失败: ${failed}`)
  if (failedList.length > 0) {
    console.log(`失败列表:`)
    failedList.slice(0, 20).forEach(f => console.log(`  - ${f.name}: ${f.error || f.body?.message}`))
  }
}

importAll().catch(console.error)
