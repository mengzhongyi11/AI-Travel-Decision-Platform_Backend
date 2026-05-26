import express from 'express'
import { getOrCreateChartOption } from '../chartPool.js'
import { getCityCode, getCurrentWeather, get7DayWeather, get24HourWeather } from './weather.js'

const router = express.Router()
const clients = new Map()

/**
 * GET /api/stream?city=xxx
 * SSE 端点，每 30 分钟推送一次完整数据
 *
 * Events:
 *   chartUpdate — { chartType, city, seriesType, option }
 *   nowUpdate   — { city, now }
 *   error       — { message }
 */
router.get('/', async (req, res) => {
  const city = req.query.city
  if (!city) {
    return res.status(400).json({ message: '缺少 city 参数' })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': 'http://localhost:5173',
  })

  // 发送初始 keepalive
  res.write(':ok\n\n')

  const clientId = Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  let intervalId

  try {
    const cityCode = await getCityCode(city)

    const pushUpdate = async () => {
      try {
        const [nowRaw, dailyRaw, hourlyRaw] = await Promise.all([
          getCurrentWeather(cityCode),
          get7DayWeather(cityCode),
          get24HourWeather(cityCode),
        ])

        const dailyData = dailyRaw.daily || []
        const hourlyData = hourlyRaw.hourly || []

        if (dailyData.length) {
          for (const st of ['temp', 'cloud', 'wind']) {
            const opt = getOrCreateChartOption('daily', cityCode, st, dailyData)
            res.write(`event: chartUpdate\ndata: ${JSON.stringify({ chartType: 'daily', city, seriesType: st, option: opt })}\n\n`)
          }
        }

        if (hourlyData.length) {
          for (const st of ['temp', 'cloud', 'wind', 'pop']) {
            const opt = getOrCreateChartOption('hourly', cityCode, st, hourlyData)
            res.write(`event: chartUpdate\ndata: ${JSON.stringify({ chartType: 'hourly', city, seriesType: st, option: opt })}\n\n`)
          }
        }

        if (nowRaw.now) {
          res.write(`event: nowUpdate\ndata: ${JSON.stringify({ city, now: nowRaw.now })}\n\n`)
        }
      } catch (err) {
        console.error('SSE push error:', err.message)
        res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
      }
    }

    // 立即推送一次，之后每 30 分钟
    await pushUpdate()
    intervalId = setInterval(pushUpdate, 30 * 60 * 1000)

    clients.set(clientId, { res, city: cityCode })

    req.on('close', () => {
      clearInterval(intervalId)
      clients.delete(clientId)
      console.log('SSE client disconnected:', clientId)
    })
  } catch (error) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`)
    res.end()
  }
})

export default router
