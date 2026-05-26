import axios from 'axios'
import express from 'express'
import TTLCache from '../utils/cache.js'

const router = express.Router()

// API 配置
const apiHost = 'mv57rkh2hx.re.qweatherapi.com'
const apiKey = 'b606a65e7d2940af96d6680d6bcb72b7'

// 创建 axios 实例，减少重复代码
const weatherApi = axios.create({
  baseURL: `https://${apiHost}`,
  headers: {
    'X-QW-Api-Key': apiKey,
    'Accept-Encoding': 'gzip',
  },
  responseType: 'json',
})

// ---- 缓存 ----
const cityCodeCache = new TTLCache(24 * 60 * 60 * 1000, 500)
const weatherCache = new TTLCache(30 * 60 * 1000, 1000)

// 通用 API 调用函数
async function callWeatherApi(endpoint, params) {
  try {
    const response = await weatherApi.get(endpoint, { params })
    return response.data
  } catch (error) {
    console.error(`${endpoint} 请求失败：`, error.response?.data || error.message)
    throw error
  }
}

// 获取城市代码
async function getCityCode(location) {
  const cacheKey = `cityCode:${location}`
  const cached = cityCodeCache.get(cacheKey)
  if (cached) return cached

  const data = await callWeatherApi('/geo/v2/city/lookup', { location })
  if (!data.location || data.location.length === 0) {
    throw new Error('未找到对应城市')
  }
  const id = data.location[0].id
  cityCodeCache.set(cacheKey, id)
  return id
}

// 获取实时天气
async function getCurrentWeather(location) {
  const cacheKey = `currentWeather:${location}`
  const cached = weatherCache.get(cacheKey)
  if (cached) return cached

  const data = await callWeatherApi('/v7/weather/now', { location })
  weatherCache.set(cacheKey, data, 10 * 60 * 1000)
  return data
}

// 获取未来七天天气
async function get7DayWeather(location) {
  const cacheKey = `7day:${location}`
  const cached = weatherCache.get(cacheKey)
  if (cached) return cached

  const data = await callWeatherApi('/v7/weather/7d', { location })
  weatherCache.set(cacheKey, data, 30 * 60 * 1000)
  return data
}

// 获取24小时天气
async function get24HourWeather(location) {
  const cacheKey = `24h:${location}`
  const cached = weatherCache.get(cacheKey)
  if (cached) return cached

  const data = await callWeatherApi('/v7/weather/24h', { location })
  weatherCache.set(cacheKey, data, 15 * 60 * 1000)
  return data
}

// ---- 路由 ----

// 获取实时天气
router.get('/nowWeather', async (req, res) => {
  try {
    const location = req.query.location
    if (!location) return res.status(400).send({ message: '缺少 location 参数' })
    const weatherData = await getCurrentWeather(location)
    return res.send({ message: '实时天气:', data: weatherData })
  } catch (error) {
    console.error('获取实时天气失败：', error)
    return res.status(500).send({ message: '获取实时天气失败', error: error.message })
  }
})

// 获取城市代码
router.get('/cityCode', async (req, res) => {
  try {
    const location = req.query.locationCode
    if (!location) return res.status(400).send({ message: '缺少 locationCode 参数' })
    const cityCode = await getCityCode(location)
    return res.send({ message: '城市代码:', data: cityCode })
  } catch (error) {
    console.error('获取城市代码失败：', error)
    return res.status(500).send({ message: '获取城市代码失败', error: error.message })
  }
})

// 获取未来七天天气
router.get('/EvenDayWeather', async (req, res) => {
  try {
    const location = req.query.location
    if (!location) return res.status(400).send({ message: '缺少 location 参数' })
    const cityCode = await getCityCode(location)
    const weatherData = await get7DayWeather(cityCode)
    return res.send({ message: '未来七天天气:', data: weatherData })
  } catch (error) {
    console.error('获取未来天气失败：', error)
    return res.status(500).send({ message: '获取未来天气失败', error: error.message })
  }
})

// 获取24小时天气
router.get('/hoursWeather', async (req, res) => {
  try {
    const location = req.query.location
    if (!location) return res.status(400).send({ message: '缺少 location 参数' })
    const cityCode = await getCityCode(location)
    const weatherData = await get24HourWeather(cityCode)
    return res.send({ message: '24小时天气:', data: weatherData })
  } catch (error) {
    console.error('获取24小时天气失败：', error)
    return res.status(500).send({ message: '获取24小时天气失败', error: error.message })
  }
})

// 聚合接口：一次调用返回所有天气数据
router.get('/aggregate', async (req, res) => {
  try {
    const location = req.query.location
    if (!location) return res.status(400).send({ message: '缺少 location 参数' })

    const cityCode = await getCityCode(location)
    const [now, daily, hourly] = await Promise.all([
      getCurrentWeather(cityCode),
      get7DayWeather(cityCode),
      get24HourWeather(cityCode),
    ])
    return res.send({ message: '聚合天气数据', data: { now, daily, hourly } })
  } catch (error) {
    console.error('获取聚合天气失败：', error)
    return res.status(500).send({ message: '获取聚合天气失败', error: error.message })
  }
})

export default router

// 导出供 chart/stream 路由复用
export { getCityCode, getCurrentWeather, get7DayWeather, get24HourWeather }
