# 气象实况可视化 — 后端代理AI-Travel-Decision-Platform_Backend

Express 代理层，为前端 Vue 应用提供统一的 API 网关。聚合 QWeather、OpenWeatherMap、阿里云 DashScope 外部 API，生成 ECharts option 和 ChartSchema，通过 SSE 实时推送数据。

## 技术栈

| 技术       | 用途                                         |
| ---------- | -------------------------------------------- |
| Express v5 | HTTP 服务框架（ES Modules）                  |
| Axios      | 外部 API HTTP 客户端                         |
| OpenAI SDK | 阿里云 DashScope (Qwen) AI 对话              |
| ioredis    | Redis 客户端（已安装，当前使用内存缓存替代） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动服务（默认端口 3001）
node app.js
```

输出 `Running http://localhost:3001` 表示启动成功。

## 目录结构

```
weather-nodejs/
├── app.js                        # Express 入口（CORS、路由挂载）
├── chartBuilders.js              # 服务端 ECharts Option 生成器
├── schemaBuilders.js             # 服务端 ChartSchema 生成器（新版）
├── chartPool.js                  # 服务端图表配置缓存池
├── utils/
│   └── cache.js                  # 泛型 TTL 内存缓存
└── router/
    ├── weather.js                # 天气 API 代理（QWeather）+ 缓存 + 聚合端点
    ├── weather_map.js            # 气象瓦片代理（OpenWeatherMap）+ 缓存 + IP 限流
    ├── chart.js                  # POST /api/chart/config（返回 ECharts option）
    ├── schema.js                 # POST /api/chart/schema（返回 ChartSchema）
    ├── stream.js                 # GET /api/stream（SSE 实时推送）
    └── openai.js                 # AI 聊天代理（DashScope Qwen 流式输出）
```

## API 端点

### 天气数据

| 方法 | 路径                                | 说明                          | 缓存 TTL   |
| ---- | ----------------------------------- | ----------------------------- | ---------- |
| GET  | `/weather/nowWeather?location=`     | 实况天气                      | 10min      |
| GET  | `/weather/cityCode?locationCode=`   | 城市代码查询                  | 24h        |
| GET  | `/weather/EvenDayWeather?location=` | 7 天预报                      | 30min      |
| GET  | `/weather/hoursWeather?location=`   | 24 小时预报                   | 15min      |
| GET  | `/weather/aggregate?location=`      | 聚合（实况+7天+24h 一次返回） | 同各子接口 |

### 图表配置

| 方法 | 路径                | 说明                               |
| ---- | ------------------- | ---------------------------------- |
| POST | `/api/chart/config` | 返回 ECharts Option JSON           |
| POST | `/api/chart/schema` | 返回 ChartSchema（语义层数据描述） |

请求体：

```json
{
  "chartType": "daily|hourly|compare",
  "city": "北京",
  "seriesType": "temp|cloud|wind|pop"
}
```

### 实时推送

| 方法 | 路径                    | 说明                         |
| ---- | ----------------------- | ---------------------------- |
| GET  | `/api/stream?city=北京` | SSE 端点，每 30 分钟推送一次 |

事件类型：

- `chartUpdate` — `{ chartType, city, seriesType, option }`
- `nowUpdate` — `{ city, now }`

### 瓦片地图

| 方法 | 路径                                  | 说明                                   |
| ---- | ------------------------------------- | -------------------------------------- |
| GET  | `/weatherMap/getMapData/:op/:z/:x/:y` | OpenWeatherMap 瓦片代理（带缓存+限流） |
| POST | `/openai/chat`                        | AI 旅行助手对话（流式输出）            |

## 缓存体系

| 缓存       | TTL      | 上限 |
| ---------- | -------- | ---- |
| 城市代码   | 24h      | 500  |
| 实况天气   | 10min    | 1000 |
| 7 天预报   | 30min    | 1000 |
| 24h 预报   | 15min    | 1000 |
| 图表配置池 | 15–30min | 200  |
| 瓦片图片   | 10min    | 1000 |

## ECharts Option / Schema 生成

### 图表类型

| chartType | 对应 builder 函数                           | 前端组件                |
| --------- | ------------------------------------------- | ----------------------- |
| `daily`   | `buildDailyOption` / `buildDailySchema`     | dailyEcharts.vue        |
| `hourly`  | `buildHourlyOption` / `buildHourlySchema`   | nowEcarts.vue（4 面板） |
| `compare` | `buildCompareOption` / `buildCompareSchema` | showData.vue            |

### Series 类型

Schema 模式下的 series.style：

| style     | 说明              | 特征                            |
| --------- | ----------------- | ------------------------------- |
| `line`    | 折线图 + 渐变面积 | gradient area、smooth           |
| `area`    | 面积图            | 纯色面积、无 symbol、opacity    |
| `bar`     | 柱状图            | 自动生成 per-item 颜色阈值      |
| `scatter` | 散点图            | 风向箭头、自动注入 symbolRotate |

## 开发说明

```bash
node app.js                       # 启动（端口 3001）
node --watch app.js               # 开发模式（文件变化自动重启）
```

项目使用 ES Modules（`"type": "module"`），所有文件使用 `import`/`export` 语法。
