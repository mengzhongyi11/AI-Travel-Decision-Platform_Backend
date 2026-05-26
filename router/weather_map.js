import axios from "axios";
import e from "express";
import express from "express";
const router = express.Router();

const apiKey = "baaf5a0f8a261bcf03e6caf89b4b3418";
const memoryCache = new Map();
const rateLimitMap = new Map();

const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  const windowKey = `${ip}:${Math.floor(now / 60000)}`;

  const count = (rateLimitMap.get(windowKey) || 0) + 1;
  rateLimitMap.set(windowKey, count);

  if (count > 60) {
    return res.status(429).json({ message: "请求过于频繁" });
  }
  next();
};

async function getWeatherMap(op, z, x, y) {
  try {
    const key = `${op}:${z}:${x}:${y}`;
    // 查缓存（10分钟）
    const cached = memoryCache.get(key);
    if (cached && Date.now() - cached.time < 600000) {
      console.log("缓存命中:", key);
      return Buffer.from(cached.data);
    }
    const response = await axios.get(
      `https://tile.openweathermap.org/map/${op}/${z}/${x}/${y}.png?appid=${apiKey}`,
      {
        responseType: "arraybuffer", // 图片数据
        timeout: 5000,
      },
    );
    // 存缓存
    memoryCache.set(key, { data: Array.from(response.data), time: Date.now() });

    // 防内存泄漏：超1000条删最旧的
    if (memoryCache.size > 1000) {
      const first = memoryCache.keys().next().value;
      memoryCache.delete(first);
    }

    return response.data;
  } catch (error) {
    console.error("天气图请求失败：", error.response?.data || error.message);
    throw error;
  }
}

router.get("/getMapData/:op/:z/:x/:y", rateLimit, async (req, res) => {
  try {
    const { op, z, x, y } = req.params;
    const weatherData = await getWeatherMap(op, z, x, y);
    // 直接返回图片数据
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=600"); // 客户端缓存 10 分钟
    res.send(weatherData);
  } catch (error) {
    return res.status(500).send({
      message: "获取天气图失败",
      error: error.message,
    });
  }
});

export default router;
