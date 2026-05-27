/**
 * 服务端 ChartSchema 生成器
 * 输出语义层数据描述，而非 ECharts option
 * 客户端 schemaRenderer 负责转为 ECharts option（含 function 字段）
 */

export function buildDailySchema(dailyData, seriesType) {
  const palette = {
    temp: {
      title: '温度 (°C)',
      series: [
        { name: '最高温', dataKey: 'tempMax', style: 'line', color: '#ff7c7c', unit: '°C' },
        { name: '最低温', dataKey: 'tempMin', style: 'line', color: '#7cb5ff', unit: '°C' },
      ],
    },
    cloud: {
      title: '云量/湿度 (%)',
      series: [
        { name: '云量', dataKey: 'cloud', style: 'area', color: '#ffd166', unit: '%', areaOpacity: 0.4 },
        { name: '湿度', dataKey: 'humidity', style: 'area', color: '#06d6a0', unit: '%', areaOpacity: 0.4 },
      ],
    },
    wind: {
      title: '风速 (km/h)',
      series: [
        { name: '昼风', dataKey: 'windSpeedDay', style: 'line', color: '#118ab2', unit: 'km/h' },
        { name: '夜风', dataKey: 'windSpeedNight', style: 'line', color: '#073b4c', unit: 'km/h' },
      ],
    },
  }

  const cfg = palette[seriesType]
  if (!cfg) return null

  const date = dailyData.map((d) => d.fxDate?.slice(5) || '')

  return {
    title: '每日天气数据',
    xAxis: { data: date },
    series: cfg.series.map((s) => ({
      name: s.name,
      data: dailyData.map((d) => Number(d[s.dataKey])),
      style: s.style,
      color: s.color,
      unit: s.unit,
      ...(s.areaOpacity !== undefined ? { areaOpacity: s.areaOpacity } : {}),
    })),
  }
}

export function buildHourlySchema(hourlyData, chartKey) {
  const fxTimes = hourlyData.map((h) => h.fxTime?.slice(11, 13) || '')

  switch (chartKey) {
    case 'temp':
      return {
        title: '温度 (°C)',
        xAxis: { data: fxTimes },
        series: [
          { name: '气温', data: hourlyData.map((h) => Number(h.temp)), style: 'line', color: '#ff7c7c', unit: '°C' },
          { name: '露点', data: hourlyData.map((h) => Number(h.dew)), style: 'line', color: '#7cb5ff', unit: '°C' },
        ],
      }

    case 'cloud':
      return {
        title: '云量/湿度 (%)',
        xAxis: { data: fxTimes },
        yAxis: [{ name: '%', min: 0, max: 100 }],
        series: [
          { name: '云量', data: hourlyData.map((h) => Number(h.cloud)), style: 'area', color: '#ffd166', unit: '%', areaOpacity: 0.4 },
          { name: '湿度', data: hourlyData.map((h) => Number(h.humidity)), style: 'area', color: '#06d6a0', unit: '%', areaOpacity: 0.4 },
        ],
      }

    case 'wind':
      return {
        title: '风速 (km/h)',
        xAxis: { data: fxTimes },
        yAxis: [
          { name: 'km/h', position: 'left' },
          { name: '风向', position: 'right', min: 0, max: 360 },
        ],
        series: [
          { name: '风速', data: hourlyData.map((h) => Number(h.windSpeed)), style: 'line', color: '#118ab2', unit: 'km/h', yAxisIndex: 0 },
          { name: '风向', data: hourlyData.map((h) => Number(h.wind360)), style: 'scatter', color: '#073b4c', unit: '°', yAxisIndex: 1 },
        ],
      }

    case 'pop':
      return {
        title: '降水 (mm/%)',
        xAxis: { data: fxTimes },
        yAxis: [
          { name: '%', position: 'left', min: 0, max: 100 },
          { name: 'mm', position: 'right' },
        ],
        series: [
          { name: '降水概率', data: hourlyData.map((h) => Number(h.pop)), style: 'line', color: '#ffd166', unit: '%', yAxisIndex: 0, dashed: true },
          { name: '降水量', data: hourlyData.map((h) => Number(h.precip)), style: 'bar', color: '#4cc9f0', unit: 'mm', yAxisIndex: 1 },
        ],
      }

    default:
      return null
  }
}

export function buildCompareSchema(citiesData, seriesType) {
  const palette = {
    temp: {
      series: [
        { name: '最高温', dataKey: 'tempMax', style: 'line', color: '#ff7c7c', unit: '°C' },
        { name: '最低温', dataKey: 'tempMin', style: 'line', color: '#7cb5ff', unit: '°C' },
      ],
    },
    cloud: {
      series: [
        { name: '云量', dataKey: 'cloud', style: 'line', color: '#ffd166', unit: '%' },
        { name: '湿度', dataKey: 'humidity', style: 'line', color: '#06d6a0', unit: '%' },
      ],
    },
    wind: {
      series: [
        { name: '昼风', dataKey: 'windSpeedDay', style: 'line', color: '#118ab2', unit: 'km/h' },
        { name: '夜风', dataKey: 'windSpeedNight', style: 'line', color: '#073b4c', unit: 'km/h' },
      ],
    },
  }

  const cfg = palette[seriesType]
  if (!cfg) return null

  const primary = citiesData[0]
  if (!primary?.daily?.length) return null

  const daily = primary.daily
  const date = daily.map((d) => d.fxDate?.slice(8) || '')

  return {
    xAxis: { data: date },
    series: cfg.series.map((s) => ({
      name: s.name,
      data: daily.map((d) => Number(d[s.dataKey])),
      style: s.style,
      color: s.color,
      unit: s.unit,
    })),
  }
}
