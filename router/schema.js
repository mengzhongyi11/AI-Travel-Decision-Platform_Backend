import express from 'express'
import { buildDailySchema, buildHourlySchema, buildCompareSchema } from '../schemaBuilders.js'
import { getCityCode, get7DayWeather, get24HourWeather } from './weather.js'

const router = express.Router()

/**
 * POST /api/chart/schema
 * Body: { chartType: 'daily'|'hourly'|'compare', city: string, seriesType: 'temp'|'cloud'|'wind'|'pop' }
 * Returns: { chartType, city, seriesType, schema }
 */
router.post('/schema', async (req, res) => {
  try {
    const { chartType, city, seriesType } = req.body
    if (!chartType || !city) {
      return res.status(400).json({ message: '缺少必要参数 chartType 或 city' })
    }

    const cityCode = await getCityCode(city)
    let rawData
    let schema

    if (chartType === 'daily') {
      const daily = await get7DayWeather(cityCode)
      rawData = daily.daily || []
      schema = buildDailySchema(rawData, seriesType || 'temp')
    } else if (chartType === 'hourly') {
      const hourly = await get24HourWeather(cityCode)
      rawData = hourly.hourly || []
      schema = buildHourlySchema(rawData, seriesType || 'temp')
    } else {
      return res.status(400).json({ message: '不支持的 chartType' })
    }

    if (!schema) {
      return res.status(404).json({ message: '生成 schema 失败' })
    }

    res.json({ chartType, city, seriesType: seriesType || 'temp', schema })
  } catch (error) {
    console.error('Schema error:', error)
    res.status(500).json({ message: '生成 schema 失败', error: error.message })
  }
})

export default router
