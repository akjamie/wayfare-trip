export interface CityAlias {
  name: string;
  nameZh: string;
  pinyin: string[];
  adcode: string;
  lat: number;
  lon: number;
  admin1: string;
}

export interface ProvinceAlias {
  nameZh: string;
  pinyin: string[];
  cityNameZh: string;
}

/** Normalize for matching: lowercase, strip apostrophes, spaces, dots, hyphens. */
export function normalizeCityKey(value: string): string {
  return value.trim().toLowerCase().replace(/[’'`\s.\-]/g, "");
}

/** Curated major-city alias table (zh + pinyin + common English -> adcode/coords). */
export const CITY_ALIASES: CityAlias[] = [
  { name: "Beijing", nameZh: "北京", pinyin: ["beijing"], adcode: "110000", lat: 39.9042, lon: 116.4074, admin1: "Beijing" },
  { name: "Shanghai", nameZh: "上海", pinyin: ["shanghai"], adcode: "310000", lat: 31.2304, lon: 121.4737, admin1: "Shanghai" },
  { name: "Guangzhou", nameZh: "广州", pinyin: ["guangzhou"], adcode: "440100", lat: 23.1291, lon: 113.2644, admin1: "Guangdong" },
  { name: "Shenzhen", nameZh: "深圳", pinyin: ["shenzhen"], adcode: "440300", lat: 22.5431, lon: 114.0579, admin1: "Guangdong" },
  { name: "Xi'an", nameZh: "西安", pinyin: ["xian", "xi'an"], adcode: "610100", lat: 34.2583, lon: 108.9286, admin1: "Shaanxi" },
  { name: "Chengdu", nameZh: "成都", pinyin: ["chengdu"], adcode: "510100", lat: 30.5728, lon: 104.0668, admin1: "Sichuan" },
  { name: "Chongqing", nameZh: "重庆", pinyin: ["chongqing"], adcode: "500000", lat: 29.563, lon: 106.5516, admin1: "Chongqing" },
  { name: "Hangzhou", nameZh: "杭州", pinyin: ["hangzhou"], adcode: "330100", lat: 30.2741, lon: 120.1551, admin1: "Zhejiang" },
  { name: "Wuhan", nameZh: "武汉", pinyin: ["wuhan"], adcode: "420100", lat: 30.5928, lon: 114.3055, admin1: "Hubei" },
  { name: "Nanjing", nameZh: "南京", pinyin: ["nanjing"], adcode: "320100", lat: 32.0603, lon: 118.7969, admin1: "Jiangsu" },
  { name: "Tianjin", nameZh: "天津", pinyin: ["tianjin"], adcode: "120000", lat: 39.3434, lon: 117.3616, admin1: "Tianjin" },
  { name: "Suzhou", nameZh: "苏州", pinyin: ["suzhou"], adcode: "320500", lat: 31.2989, lon: 120.5853, admin1: "Jiangsu" },
  { name: "Jinan", nameZh: "济南", pinyin: ["jinan"], adcode: "370100", lat: 36.6512, lon: 117.12, admin1: "Shandong" },
  { name: "Fuzhou", nameZh: "福州", pinyin: ["fuzhou"], adcode: "350100", lat: 26.0745, lon: 119.2965, admin1: "Fujian" },
  { name: "Qingdao", nameZh: "青岛", pinyin: ["qingdao"], adcode: "370200", lat: 36.0671, lon: 120.3826, admin1: "Shandong" },
  { name: "Changsha", nameZh: "长沙", pinyin: ["changsha"], adcode: "430100", lat: 28.2282, lon: 112.9388, admin1: "Hunan" },
  { name: "Zhengzhou", nameZh: "郑州", pinyin: ["zhengzhou"], adcode: "410100", lat: 34.7466, lon: 113.6254, admin1: "Henan" },
  { name: "Kunming", nameZh: "昆明", pinyin: ["kunming"], adcode: "530100", lat: 25.0389, lon: 102.7183, admin1: "Yunnan" },
  { name: "Xiamen", nameZh: "厦门", pinyin: ["xiamen"], adcode: "350200", lat: 24.4798, lon: 118.0894, admin1: "Fujian" },
  { name: "Harbin", nameZh: "哈尔滨", pinyin: ["haerbin", "harbin"], adcode: "230100", lat: 45.8038, lon: 126.535, admin1: "Heilongjiang" },
  { name: "Shenyang", nameZh: "沈阳", pinyin: ["shenyang"], adcode: "210100", lat: 41.8057, lon: 123.4315, admin1: "Liaoning" },
  { name: "Dalian", nameZh: "大连", pinyin: ["dalian"], adcode: "210200", lat: 38.914, lon: 121.6147, admin1: "Liaoning" },
];

/** Province -> capital city aliases (e.g. 广东 -> 广州). */
export const PROVINCE_ALIASES: ProvinceAlias[] = [
  { nameZh: "广东", pinyin: ["guangdong"], cityNameZh: "广州" },
  { nameZh: "陕西", pinyin: ["shaanxi"], cityNameZh: "西安" },
  { nameZh: "四川", pinyin: ["sichuan"], cityNameZh: "成都" },
  { nameZh: "浙江", pinyin: ["zhejiang"], cityNameZh: "杭州" },
  { nameZh: "湖北", pinyin: ["hubei"], cityNameZh: "武汉" },
  { nameZh: "江苏", pinyin: ["jiangsu"], cityNameZh: "南京" },
  { nameZh: "湖南", pinyin: ["hunan"], cityNameZh: "长沙" },
  { nameZh: "河南", pinyin: ["henan"], cityNameZh: "郑州" },
  { nameZh: "云南", pinyin: ["yunnan"], cityNameZh: "昆明" },
  { nameZh: "山东", pinyin: ["shandong"], cityNameZh: "济南" },
  { nameZh: "福建", pinyin: ["fujian"], cityNameZh: "福州" },
  { nameZh: "辽宁", pinyin: ["liaoning"], cityNameZh: "沈阳" },
  { nameZh: "黑龙江", pinyin: ["heilongjiang"], cityNameZh: "哈尔滨" },
];
