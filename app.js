import express from 'express'
import cors from 'cors'
import weatherRouter from './router/weather.js'
import weatherMapRouter from './router/weather_map.js'
import openAIRouter from './router/openai.js'
import chartRouter from './router/chart.js'
import streamRouter from './router/stream.js'

const app = express()

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb', strict: false }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// CORS 配置
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }),
)
app.use(cors())

// 路由挂载
app.use('/weather', weatherRouter)
app.use('/weatherMap', weatherMapRouter)
app.use('/openai', openAIRouter)
app.use('/api/chart', chartRouter)
app.use('/api/stream', streamRouter)

app.listen(3001, () => {
  console.log('Running http://localhost:3001')
})
