export type Lang = "en" | "zh-CN";

export const DEFAULT_LANG: Lang = "en";

const EN: Record<string, string> = {
  "advice.weather": "{weather}, {min}-{max}°C, {precip}% chance of precipitation.",
  "advice.rain": "Rain is expected, so prefer indoor attractions such as museums and galleries.",
  "advice.hot": "It will be hot, so avoid outdoor attractions between {noon}.",
  "advice.good": "Good conditions for visiting outdoor attractions.",
  "env.indoor": "indoor",
  "env.outdoor": "outdoor",
  "env.mixed": "mixed",
  "slot.morning": "Morning",
  "slot.afternoon": "Afternoon",
  "slot.evening": "Evening",
  "reason.rain": "Indoor-friendly on a rainy day.",
  "reason.hot.outdoor": "Best avoided around midday when it is hot.",
  "reason.hot.indoor": "A cool indoor option for a hot day.",
  "reason.good": "Great fit for today's weather.",
  "intro.template": "{category}; {env} attraction{rating}{address}.",
  "summary.header": "Weather-aware attraction recommendations for {city}, {days} day(s) ahead:",
  "notice.no_attraction_data": "No attraction data is available for this city yet.",
  "notice.no_hotel_data": "No hotel recommendations are available for this city yet.",
  "notice.no_hotel_match": "No hotels match your preferences. Try relaxing them.",
  "notice.no_star_match": "No {n}-star hotels here — showing the best available options instead.",
  "notice.limited_indoor": "Rain is expected and indoor options are limited, so some outdoor attractions are included.",
  "hotel.star": "{n}-star hotel",
  "hotel.price": "≈¥{price}/night",
  "hotel.primary": "Primary",
  "hotel.reason": "Recommended for this trip.",
  "hotel.reason.rated": "Rated {rating}, close to your itinerary.",
  "route.mode.walk": "walk",
  "route.mode.drive": "drive",
  "route.distance": "{km} km",
  "route.duration": "{min} min",
  "ui.title": "Weather-aware attraction recommendations",
  "ui.subtitle": "Enter a Chinese city (Chinese or pinyin).",
  "ui.search": "Recommend",
  "ui.language": "Language",
  "wx.0": "Clear sky",
  "wx.1": "Mainly clear",
  "wx.2": "Partly cloudy",
  "wx.3": "Overcast",
  "wx.45": "Fog",
  "wx.48": "Depositing rime fog",
  "wx.51": "Light drizzle",
  "wx.53": "Moderate drizzle",
  "wx.55": "Dense drizzle",
  "wx.61": "Slight rain",
  "wx.63": "Moderate rain",
  "wx.65": "Heavy rain",
  "wx.66": "Freezing rain",
  "wx.67": "Heavy freezing rain",
  "wx.71": "Slight snow",
  "wx.73": "Moderate snow",
  "wx.75": "Heavy snow",
  "wx.77": "Snow grains",
  "wx.80": "Slight rain showers",
  "wx.81": "Moderate rain showers",
  "wx.82": "Violent rain showers",
  "wx.85": "Slight snow showers",
  "wx.86": "Heavy snow showers",
  "wx.95": "Thunderstorm",
  "wx.96": "Thunderstorm with slight hail",
  "wx.99": "Thunderstorm with heavy hail",
};

const ZH: Record<string, string> = {
  "advice.weather": "{weather}，{min}-{max}°C，降水概率 {precip}%。",
  "advice.rain": "预计有雨，建议优先选择博物馆、展馆等室内景点。",
  "advice.hot": "天气炎热，请避免在 {noon} 期间前往户外景点。",
  "advice.good": "天气不错，适合游览户外景点。",
  "env.indoor": "室内",
  "env.outdoor": "户外",
  "env.mixed": "混合",
  "slot.morning": "上午",
  "slot.afternoon": "下午",
  "slot.evening": "傍晚",
  "reason.rain": "雨天适合的室内景点。",
  "reason.hot.outdoor": "高温正午时段不宜前往。",
  "reason.hot.indoor": "炎热天气里的清凉室内选择。",
  "reason.good": "很适合今天的天气。",
  "intro.template": "{category}；{env}景点{rating}{address}。",
  "summary.header": "{city} 未来 {days} 天天气感知景点推荐：",
  "notice.no_attraction_data": "暂未收录该城市的景点数据。",
  "notice.no_hotel_data": "暂未找到该城市的酒店推荐。",
  "notice.no_hotel_match": "没有符合偏好的酒店，试试放宽条件。",
  "notice.no_star_match": "本地没有找到 {n} 星级酒店——为你推荐评分最高的酒店。",
  "notice.limited_indoor": "预计有雨且室内景点有限，因此加入了部分户外景点。",
  "hotel.star": "{n}星级酒店",
  "hotel.price": "约 ¥{price}/晚",
  "hotel.primary": "首选",
  "hotel.reason": "本次行程推荐。",
  "hotel.reason.rated": "评分 {rating}，靠近行程景点。",
  "route.mode.walk": "步行",
  "route.mode.drive": "驾车",
  "route.distance": "{km} 公里",
  "route.duration": "{min} 分钟",
  "ui.title": "天气感知景点推荐",
  "ui.subtitle": "输入中国城市（支持中文或拼音）。",
  "ui.search": "推荐",
  "ui.language": "语言",
  "wx.0": "晴",
  "wx.1": "晴间多云",
  "wx.2": "多云",
  "wx.3": "阴",
  "wx.45": "雾",
  "wx.48": "冻雾",
  "wx.51": "小毛毛雨",
  "wx.53": "毛毛雨",
  "wx.55": "大毛毛雨",
  "wx.61": "小雨",
  "wx.63": "中雨",
  "wx.65": "大雨",
  "wx.66": "冻雨",
  "wx.67": "强冻雨",
  "wx.71": "小雪",
  "wx.73": "中雪",
  "wx.75": "大雪",
  "wx.77": "雪粒",
  "wx.80": "小阵雨",
  "wx.81": "中阵雨",
  "wx.82": "强阵雨",
  "wx.85": "小阵雪",
  "wx.86": "强阵雪",
  "wx.95": "雷阵雨",
  "wx.96": "雷阵雨伴小冰雹",
  "wx.99": "雷阵雨伴强冰雹",
};

export const CATALOGS: Record<Lang, Record<string, string>> = {
  en: EN,
  "zh-CN": ZH,
};

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "zh-CN";
}

/**
 * Precedence: explicit `lang` param → Accept-Language → `en`.
 * An unsupported explicit `lang` value falls back to `en`.
 */
export function resolveLang(
  langParam?: string | null,
  acceptLanguage?: string | null,
): Lang {
  const p = (langParam ?? "").trim().toLowerCase();
  if (p) {
    if (p === "en" || p.startsWith("en-")) return "en";
    if (p === "zh" || p.startsWith("zh-")) return "zh-CN";
    return DEFAULT_LANG; // unsupported explicit value -> en
  }
  const a = (acceptLanguage ?? "").trim().toLowerCase();
  if (a.includes("zh")) return "zh-CN";
  if (a.includes("en")) return "en";
  return DEFAULT_LANG;
}

export function hasKey(lang: Lang, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATALOGS[lang], key);
}

export function t(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const template = CATALOGS[lang][key];
  if (template === undefined) return `⟦missing:${key}⟧`;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
}

export function weatherText(lang: Lang, code: number): string {
  return t(lang, `wx.${code}`);
}

export function environmentLabel(lang: Lang, env: string): string {
  return t(lang, `env.${env}`);
}
