/**
 * 服务端图表配置池
 * 缓存已生成的 ECharts Option，避免重复构建
 */

import { buildDailyOption, buildHourlyOption, buildCompareOption } from './chartBuilders.js'

const pool = new Map()
const MAX_SIZE = 200
const TTL = {
  daily: 30 * 60 * 1000,
  hourly: 15 * 60 * 1000,
  compare: 30 * 60 * 1000,
}

function getTimeBucket(chartType) {
  const now = Date.now()
  const bucketMs = chartType === 'daily' || chartType === 'compare' ? 30 * 60 * 1000 : 15 * 60 * 1000
  return Math.floor(now / bucketMs) * bucketMs
}

export function getOrCreateChartOption(chartType, cityCode, seriesType, rawData) {
  const timeBucket = getTimeBucket(chartType)
  const key = `${chartType}:${cityCode}:${seriesType}:${timeBucket}`

  const existing = pool.get(key)
  if (existing && Date.now() < existing.expiresAt) {
    return existing.option
  }

  let option
  switch (chartType) {
    case 'daily':
      option = buildDailyOption(rawData, seriesType)
      break
    case 'hourly':
      option = buildHourlyOption(rawData, seriesType)
      break
    case 'compare':
      option = buildCompareOption(rawData, seriesType)
      break
    default:
      throw new Error(`Unknown chartType: ${chartType}`)
  }

  // 淘汰最旧条目
  if (pool.size >= MAX_SIZE) {
    const keys = [...pool.keys()]
    const deleteCount = Math.ceil(MAX_SIZE * 0.25)
    for (let i = 0; i < deleteCount; i++) {
      pool.delete(keys[i])
    }
  }

  pool.set(key, { option, expiresAt: Date.now() + (TTL[chartType] || 15 * 60 * 1000) })
  return option
}

export function clearPool() {
  pool.clear()
}

export function getPoolSize() {
  return pool.size
}
