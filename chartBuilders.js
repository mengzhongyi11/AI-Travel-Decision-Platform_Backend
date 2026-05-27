/**
 * 服务端 ECharts Option 生成器
 * 纯函数，输入 QWeather 原始数据，输出完整 EChartsOption JSON
 *
 * 注意：
 * - label formatter 使用 ECharts 内置模版语法（`'{value}°'`），可 JSON 序列化
 * - tooltip formatter / symbolRotate 等 function 字段不在此输出
 *   由客户端 patchTooltipFormatter 在接收后注入
 * - 渐变 areaStyle.color 是纯对象字面量，可正常序列化
 */

// ---- 工具函数 ----

function createLineSeries(name, data, color, gradient = true) {
  const series = {
    name,
    type: "line",
    data,
    smooth: true,
    lineStyle: { width: 2, color },
    itemStyle: { color },
    symbol: "circle",
    symbolSize: 4,
    emphasis: {
      focus: "series",
      itemStyle: { borderWidth: 2, borderColor: "#fff", scale: 1.5 },
    },
  };
  if (gradient) {
    series.areaStyle = {
      color: {
        type: "linear",
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [
          { offset: 0, color: color + "60" },
          { offset: 1, color: color + "00" },
        ],
      },
    };
  }
  return series;
}

function createAreaSeries(name, data, color, opacity = 0.4) {
  return {
    name,
    type: "line",
    data,
    smooth: true,
    symbol: "none",
    lineStyle: { width: 1, color },
    areaStyle: { color, opacity },
    itemStyle: { color },
    emphasis: { focus: "series", itemStyle: { opacity: 1 } },
  };
}

// ---- 每日 7 天预报（对应 dailyEcharts.vue）----

export function buildDailyOption(dailyData, seriesType) {
  const palette = {
    temp: {
      name: "温度 (°C)",
      name1: "最高温",
      name2: "最低温",
      data1: dailyData.map((d) => Number(d.tempMax)),
      data2: dailyData.map((d) => Number(d.tempMin)),
      color1: "#ff7c7c",
      color2: "#7cb5ff",
      formatter: "{c}°",
    },
    cloud: {
      name: "云量/湿度 (%)",
      name1: "云量",
      name2: "湿度",
      data1: dailyData.map((d) => Number(d.cloud)),
      data2: dailyData.map((d) => Number(d.humidity)),
      color1: "#ffd166",
      color2: "#06d6a0",
      formatter: "{c}%",
    },
    wind: {
      name: "风速 (km/h)",
      name1: "昼风",
      name2: "夜风",
      data1: dailyData.map((d) => Number(d.windSpeedDay)),
      data2: dailyData.map((d) => Number(d.windSpeedNight)),
      color1: "#118ab2",
      color2: "#073b4c",
      formatter: "{c}km/h",
    },
  };

  const cfg = palette[seriesType];
  if (!cfg) return null;

  const date = dailyData.map((d) => d.fxDate?.slice(5) || "");

  return {
    title: {
      text: "每日天气数据",
      top: "0%",
      textStyle: { color: "#ff7c7c", fontSize: 10, fontWeight: "bold" },
    },
    legend: {
      data: [cfg.name1, cfg.name2],
      selectedMode: 'multiple',
      textStyle: { color: "#cccccc" },
    },
    grid: { left: "3%", right: "3%", bottom: "5%", top: "10%", height: "70%" },
    xAxis: {
      type: "category",
      data: date,
      axisLabel: { color: "#ffffff" },
      axisLine: { lineStyle: { color: "#cccccc" } },
    },
    yAxis: {
      type: "value",
      name: cfg.name,
      nameTextStyle: { color: "#ffffff" },
      axisLabel: { color: "#ffffff" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    },
    series: [
      {
        name: cfg.name1,
        type: "line",
        data: cfg.data1,
        smooth: true,
        label: {
          show: true,
          position: "top",
          color: cfg.color1,
          fontSize: 11,
          formatter: cfg.formatter,
        },
        itemStyle: { color: cfg.color1 },
      },
      {
        name: cfg.name2,
        type: "line",
        data: cfg.data2,
        smooth: true,
        label: {
          show: true,
          position: "bottom",
          color: cfg.color2,
          fontSize: 11,
          formatter: cfg.formatter,
        },
        itemStyle: { color: cfg.color2 },
      },
    ],
  };
}

// ---- 逐小时 4 面板（对应 nowEcarts.vue）----

export function buildHourlyOption(hourlyData, chartKey) {
  const fxTimes = hourlyData.map((h) => h.fxTime?.slice(11, 13) || "");
  const temps = hourlyData.map((h) => Number(h.temp));
  const dews = hourlyData.map((h) => Number(h.dew));
  const clouds = hourlyData.map((h) => Number(h.cloud));
  const humiditys = hourlyData.map((h) => Number(h.humidity));
  const windSpeeds = hourlyData.map((h) => Number(h.windSpeed));
  const pops = hourlyData.map((h) => Number(h.pop));
  const wind360s = hourlyData.map((h) => Number(h.wind360));

  switch (chartKey) {
    case "temp":
      return buildTempOption(fxTimes, temps, dews);
    case "cloud":
      return buildCloudOption(fxTimes, clouds, humiditys);
    case "wind":
      return buildWindOption(fxTimes, windSpeeds, wind360s);
    case "pop":
      return buildPopOption(fxTimes, pops, hourlyData);
    default:
      return null;
  }
}

function buildTempOption(fxTimes, temps, dews) {
  return {
    title: {
      text: "温度 (°C)",
      textStyle: { color: "#ff7c7c", fontSize: 10 },
      left: "center",
    },
    grid: { left: "5%", right: "5%", top: "15%", bottom: "18%" },
    legend: {
      data: ["气温", "露点"],
      selectedMode: 'multiple',
      bottom: 0,
      textStyle: { color: "#cccccc", fontSize: 9 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: "category",
      data: fxTimes,
      axisLabel: { color: "#ffffff", fontSize: 8 },
      axisLine: { lineStyle: { color: "#cccccc" } },
    },
    yAxis: {
      type: "value",
      name: "°C",
      nameTextStyle: { color: "#ffffff", fontSize: 8 },
      axisLabel: { color: "#ffffff", fontSize: 8 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    },
    series: [
      createLineSeries("气温", temps, "#ff7c7c", true),
      createLineSeries("露点", dews, "#7cb5ff", true),
    ],
  };
}

function buildCloudOption(fxTimes, clouds, humiditys) {
  return {
    title: {
      text: "云量/湿度 (%)",
      textStyle: { color: "#ffd166", fontSize: 10 },
      left: "center",
    },
    grid: { left: "5%", right: "5%", top: "15%", bottom: "18%" },
    legend: {
      data: ["云量", "湿度"],
      bottom: 0,
      textStyle: { color: "#cccccc", fontSize: 9 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: "category",
      data: fxTimes,
      axisLabel: { color: "#ffffff", fontSize: 8 },
      axisLine: { lineStyle: { color: "#cccccc" } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      name: "%",
      nameTextStyle: { color: "#ffffff", fontSize: 8 },
      axisLabel: { color: "#ffffff", fontSize: 8, formatter: "{value}%" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    },
    series: [
      createAreaSeries("云量", clouds, "#ffd166", 0.4),
      createAreaSeries("湿度", humiditys, "#06d6a0", 0.4),
    ],
  };
}

function buildWindOption(fxTimes, windSpeeds, wind360s) {
  return {
    title: {
      text: "风速 (km/h)",
      textStyle: { color: "#118ab2", fontSize: 10 },
      left: "center",
    },
    grid: { left: "5%", right: "5%", top: "15%", bottom: "22%" },
    legend: {
      data: ["风速", "风向"],
      bottom: 0,
      textStyle: { color: "#cccccc", fontSize: 9 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: "category",
      data: fxTimes,
      axisLabel: { color: "#ffffff", fontSize: 8 },
      axisLine: { lineStyle: { color: "#cccccc" } },
    },
    yAxis: [
      {
        type: "value",
        name: "km/h",
        position: "left",
        nameTextStyle: { color: "#118ab2", fontSize: 8 },
        axisLabel: { color: "#118ab2", fontSize: 8 },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      },
      {
        type: "value",
        name: "风向",
        position: "right",
        min: 0,
        max: 360,
        axisLabel: { show: false },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        ...createLineSeries("风速", windSpeeds, "#118ab2", true),
        yAxisIndex: 0,
      },
      {
        name: "风向",
        type: "scatter",
        yAxisIndex: 1,
        data: wind360s,
        symbol: "path://M5,0 L10,10 L5,8 L0,10 Z",
        symbolSize: 10,
        itemStyle: { color: "#073b4c", opacity: 0.8 },
        emphasis: {
          scale: 1.5,
          itemStyle: { borderWidth: 2, borderColor: "#fff" },
        },
        // symbolRotate 由客户端 patch 注入（function 不可 JSON 序列化）
      },
    ],
  };
}

function buildPopOption(fxTimes, pops, hourlyData) {
  // 降水量条颜色：服务端预计算为 per-item data
  const precipData = hourlyData.map((h) => {
    const val = Number(h.precip);
    let color = "rgba(255,255,255,0.05)";
    if (val > 0 && val <= 5) color = "#4cc9f0";
    else if (val <= 20) color = "#ffd166";
    else if (val > 20) color = "#e63946";
    return { value: val, itemStyle: { color, borderRadius: [3, 3, 0, 0] } };
  });

  return {
    title: {
      text: "降水 (mm/%)",
      textStyle: { color: "#06d6a0", fontSize: 10 },
      left: "center",
    },
    grid: { left: "5%", right: "5%", top: "15%", bottom: "22%" },
    legend: {
      data: ["降水概率", "降水量"],
      bottom: 0,
      textStyle: { color: "#cccccc", fontSize: 9 },
      itemWidth: 10,
      itemHeight: 10,
    },
    xAxis: {
      type: "category",
      data: fxTimes,
      boundaryGap: true,
      axisLabel: { color: "#ffffff", fontSize: 8 },
      axisLine: { lineStyle: { color: "#cccccc" } },
    },
    yAxis: [
      {
        type: "value",
        name: "%",
        position: "left",
        min: 0,
        max: 100,
        nameTextStyle: { color: "#06d6a0", fontSize: 8 },
        axisLabel: { color: "#06d6a0", fontSize: 8, formatter: "{value}%" },
        splitLine: { show: false },
      },
      {
        type: "value",
        name: "mm",
        position: "right",
        nameTextStyle: { color: "#ffd166", fontSize: 8 },
        axisLabel: { color: "#ffd166", fontSize: 8, formatter: "{value}mm" },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
      },
    ],
    series: [
      {
        name: "降水概率",
        type: "line",
        yAxisIndex: 0,
        data: pops,
        smooth: true,
        lineStyle: { width: 2, type: "dashed", color: "#ffd166" },
        areaStyle: { color: "#ffd166", opacity: 0.2 },
        itemStyle: { color: "#ffd166", opacity: 0 },
        emphasis: { itemStyle: { opacity: 1 } },
        symbol: "none",
      },
      {
        name: "降水量",
        type: "bar",
        yAxisIndex: 1,
        data: precipData,
        barWidth: "50%",
      },
    ],
  };
}

// ---- 路线对比（对应 showData.vue）----

export function buildCompareOption(citiesData, seriesType) {
  // citiesData: [{ city, daily: [...] }, ...]
  // 只取第一个城市的第 1 组对比数据（简化）
  // 原 showData.vue 的 chartConfig 逻辑
  const palette = {
    temp: {
      name: "温度 (°C)",
      name1: "最高温",
      name2: "最低温",
      data1Key: "tempMax",
      data2Key: "tempMin",
      color1: "#ff7c7c",
      color2: "#7cb5ff",
      formatter: '{c}°',
    },
    cloud: {
      name: "云量/湿度 (%)",
      name1: "云量",
      name2: "湿度",
      data1Key: "cloud",
      data2Key: "humidity",
      color1: "#ffd166",
      color2: "#06d6a0",
      formatter: '{c}%',
    },
    wind: {
      name: "风速 (km/h)",
      name1: "昼风",
      name2: "夜风",
      data1Key: "windSpeedDay",
      data2Key: "windSpeedNight",
      color1: "#118ab2",
      color2: "#073b4c",
      formatter: '{c}km/h',
    },
  };

  const cfg = palette[seriesType];
  if (!cfg) return null;

  // 取第一个城市的 daily 数据作为主数据
  const primary = citiesData[0];
  if (!primary?.daily?.length) return null;

  const daily = primary.daily;
  const date = daily.map((d) => d.fxDate?.slice(8) || "");

  return {
    grid: { left: "3%", right: "3%", bottom: "10%", top: "15%" },
    xAxis: {
      type: "category",
      data: date,
      axisLabel: { color: "#ffffff" },
      axisLine: { lineStyle: { color: "#cccccc" } },
    },
    yAxis: {
      type: "value",
      name: cfg.name,
      nameTextStyle: { color: "#ffffff" },
      axisLabel: { color: "#ffffff" },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.1)" } },
    },
    series: [
      {
        name: cfg.name1,
        type: "line",
        data: daily.map((d) => Number(d[cfg.data1Key])),
        smooth: true,
        label: {
          show: true,
          position: "top",
          color: cfg.color1,
          fontSize: 11,
          formatter: cfg.formatter,
        },
        itemStyle: { color: cfg.color1 },
      },
      {
        name: cfg.name2,
        type: "line",
        data: daily.map((d) => Number(d[cfg.data2Key])),
        smooth: true,
        label: {
          show: true,
          position: "bottom",
          color: cfg.color2,
          fontSize: 11,
          formatter: cfg.formatter,
        },
        itemStyle: { color: cfg.color2 },
      },
    ],
  };
}
