import axios from "axios";
import express from "express";
import OpenAI from "openai";

const router = express.Router();

const TRAVEL_SYSTEM_PROMPT = `
你是"旅途AI"，专业的智能旅游规划助手。你的核心能力：

【角色定位】
- 资深旅行规划师：擅长路线设计、时间优化、预算控制
- 当地体验专家：推荐地道美食、隐藏景点、文化体验
- 实时顾问：结合地址、天气、季节、节假日、用户给出的时间，用户给出的路线给出建议

【输出规范】
1. 首次回复必须包含：行程概览表（时间|地点|活动|预算）
2. 使用emoji增强可读性：🗺️路线 🍜美食 🏨住宿 💰费用 ⏰时间
3. 关键信息用【】高亮，如【建议游玩3小时】
4. 涉及价格时标注"约XX元"并说明淡旺季差异

【安全与实用】
- 必提：当地紧急电话、医保政策、高原/海岛注意事项
- 交通：标注班次时间、提前预订提醒、替代方案
- 住宿：按预算分档（经济/舒适/豪华），附预订平台建议

【交互规则】
- 主动询问：出行天数、预算范围、旅行风格（打卡/休闲/探险）
- 未明确时：提供2-3套方案对比（经典版/深度版/省钱版）
- 拒绝回答：危险行为（野游、黑车）、违法违规内容

【知识时效】
- 门票价格、开放时间标注"以官方最新为准"
- 2024年后新开景点需特别标注"新景点"`;

function deepFlatten(context) {
  const result = {
    location: [],
    weather: [],
  };

  // 递归遍历提取 location 和 weather 原始数据
  function traverse(item) {
    if (Array.isArray(item)) {
      item.forEach((i) => traverse(i));
    } else if (typeof item === "object" && item !== null) {
      if (item.hasOwnProperty("location")) {
        result.location = Array.isArray(item.location) ? item.location : [item.location];
      }
      if (item.hasOwnProperty("weather")) {
        result.weather = Array.isArray(item.weather) ? item.weather : [item.weather];
      }
    }
  }

  traverse(context);

  // 递归扁平化任意对象为 "键:值" 字符串
  function flattenToString(obj) {
    if (obj === null || obj === undefined) {
      return String(obj);
    }
    if (typeof obj !== "object") {
      return String(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => flattenToString(item)).join(",");
    }

    // 处理对象
    let str = "";
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const valueStr = flattenToString(value);
        str += `${key}：${valueStr};`;
      }
    }
    return str.replace(/;$/, "");
  }

  // 1. location 转为逗号分隔的字符串
  const locationStr = result.location.join(",");

  // 2. weather 每个对象递归扁平化
  const weatherStrList = result.weather.map((item) => {
    return flattenToString(item);
  });

  // 3. 多个weather字符串用中文逗号拼接
  const weatherStr = weatherStrList.join("，");

  // 返回对象格式
  return {
    location: locationStr,
    weather: weatherStr,
  };
}

// 从原始 contexts 数组中提取指定 key 的值
function getContextValue(contexts, key) {
  if (!Array.isArray(contexts)) return null
  for (const item of contexts) {
    if (item && typeof item === 'object' && key in item) {
      return item[key]
    }
  }
  return null
}

// 构建增强提示词
const buildPrompt = (message, contexts) => {
  let prompt = message;

  const flat = deepFlatten(contexts);
  const ctxInfo = [];

  // 从 deepFlatten 获取 location 和 weather
  if (flat?.location) ctxInfo.push(`📍用户当前位置/用户给出的路线：${flat.location}`);
  if (flat?.weather) ctxInfo.push(`📍已有的天气：${flat.weather}`);

  // 其他字段直接从原始 contexts 数组读取
  const days = getContextValue(contexts, 'days');
  if (days) ctxInfo.push(`⏰计划天数：${days}天`);

  const budget = getContextValue(contexts, 'budget');
  if (budget) {
    const budgetMap = {
      low: "经济型（<2000元）",
      medium: "舒适型（2000-5000元）",
      high: "豪华型（>5000元）",
    };
    ctxInfo.push(`💰预算档次：${budgetMap[budget] || budget}`);
  }

  const style = getContextValue(contexts, 'style');
  if (style) {
    const styleMap = {
      relax: "休闲度假",
      adventure: "户外探险",
      culture: "人文历史",
      food: "美食打卡",
    };
    ctxInfo.push(`🎯旅行风格：${styleMap[style] || style}`);
  }

  const companions = getContextValue(contexts, 'companions');
  if (companions) {
    const compMap = {
      solo: "独自旅行",
      couple: "情侣出游",
      family: "家庭亲子",
      friends: "朋友结伴",
    };
    ctxInfo.push(`👥同行人员：${compMap[companions] || companions}`);
  }

  if (ctxInfo.length > 0) {
    prompt = `[用户信息]\\n${ctxInfo.join("\\n")}\\n\\n[用户询问]\\n${message}`;
  }

  return prompt;
};

const apiKey = "sk-8db4e4d2fd9f46458444e98752cbc3d3";

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

router.post("/chat", async (req, res) => {
  try {
    console.log(req.body);
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ message: "缺少 message 参数" });
    }

    // 设置响应头，适配流式返回（关键）
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    const userPrompt = buildPrompt(message, context);
    const stream = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [
        { role: "system", content: TRAVEL_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(content);
        await new Promise((resolve) => setImmediate(resolve));
      }
    }

    res.end();
  } catch (error) {
    console.error("OpenAI API 请求失败：", error.message);
    res.status(500).json({ message: "请求失败", error: error.message });
  }
});

export default router;
