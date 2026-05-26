import express from 'express'
import { getOrCreateChartOption } from '../chartPool.js'
import { getCityCode, get7DayWeather, get24HourWeather } from './weather.js'

const router = express.Router()

/**
 * POST /api/chart/config
 * Body: { chartType: 'daily'|'hourly'|'compare', city: string, seriesType: 'temp'|'cloud'|'wind'|'pop' }
 * Returns: { chartType, city, seriesType, option }
 */
router.post('/config', async (req, res) => {
  try {
    const { chartType, city, seriesType } = req.body
    if (!chartType || !city) {
      return res.status(400).json({ message: '缺少必要参数 chartType 或 city' })
    }

    const cityCode = await getCityCode(city)
    let rawData

    if (chartType === 'daily') {
      const daily = await get7DayWeather(cityCode)
      rawData = daily.daily || []
    } else if (chartType === 'hourly') {
      const hourly = await get24HourWeather(cityCode)
      rawData = hourly.hourly || []
    } else {
      return res.status(400).json({ message: '不支持的 chartType，仅支持 daily / hourly' })
    }

    if (!rawData.length) {
      return res.status(404).json({ message: '未获取到天气数据' })
    }

    const option = getOrCreateChartOption(chartType, cityCode, seriesType || 'temp', rawData)
    res.json({ chartType, city, seriesType: seriesType || 'temp', option })
  } catch (error) {
    console.error('Chart config error:', error)
    res.status(500).json({ message: '生成图表配置失败', error: error.message })
  }
})

export default router
