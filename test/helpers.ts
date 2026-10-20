import type { FetchLike, FetchResponse } from "../src/http.js";

export interface Route {
  match: string | RegExp;
  respond: (url: string) => unknown | Promise<unknown>;
  status?: number;
}

export interface MockFetch extends FetchLike {
  calls: string[];
  count(substr: string): number;
}

export function makeFetch(
  routes: Route[],
  opts: { fail?: (url: string) => boolean } = {},
): MockFetch {
  const calls: string[] = [];
  const fn = (async (url: string): Promise<FetchResponse> => {
    calls.push(url);
    if (opts.fail?.(url)) throw new Error("simulated network failure");
    for (const r of routes) {
      const hit =
        typeof r.match === "string" ? url.includes(r.match) : r.match.test(url);
      if (hit) {
        const body = await r.respond(url);
        const status = r.status ?? 200;
        return { ok: status < 400, status, json: async () => body };
      }
    }
    throw new Error("no mock route for " + url);
  }) as MockFetch;
  fn.calls = calls;
  fn.count = (substr: string) => calls.filter((c) => c.includes(substr)).length;
  return fn;
}

export const GEO = "geocoding-api.open-meteo.com";
export const AMAP_GEOCODE = "geocode/geo";
export const AMAP_REGEO = "geocode/regeo";
export const AMAP_TEXT = "place/text";
export const WEATHER = "api.open-meteo.com/v1/forecast";

export const beijingGeo = {
  results: [
    {
      name: "Beijing",
      latitude: 39.9042,
      longitude: 116.4074,
      country_code: "CN",
      admin1: "Beijing",
      population: 11716620,
    },
  ],
};

export const regeoBody = { status: "1", regeocode: { addressComponent: { adcode: "110000" } } };

export const poisBody = {
  status: "1",
  count: "3",
  pois: [
    {
      id: "B0MUSEUM",
      name: "故宫博物院",
      typecode: "140100",
      type: "科教文化服务;博物馆;博物馆",
      location: "116.397,39.918",
      address: "北京市东城区景山前街4号",
      biz_ext: { rating: "4.8" },
      photos: [{ url: "https://store.is.autonavi.com/museum.jpg" }],
    },
    {
      id: "B0PARK",
      name: "颐和园",
      typecode: "110100",
      type: "风景名胜;公园广场;公园广场",
      location: "116.275,39.999",
      address: "北京市海淀区",
    },
    {
      id: "B0TEMPLE",
      name: "雍和宫",
      typecode: "110205",
      type: "风景名胜;风景名胜;寺庙道观",
      location: "116.417,39.947",
    },
  ],
};

export function dayList(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    `2026-07-${String(i + 1).padStart(2, "0")}`,
  );
}

export function weatherBody(
  n: number,
  over: { precip?: number[]; tmax?: number[]; tmin?: number[]; code?: number[] } = {},
): unknown {
  const fill = (v: number) => Array.from({ length: n }, () => v);
  return {
    daily: {
      time: dayList(n),
      temperature_2m_max: over.tmax ?? fill(25),
      temperature_2m_min: over.tmin ?? fill(18),
      precipitation_probability_max: over.precip ?? fill(0),
      weather_code: over.code ?? fill(0),
    },
  };
}

/** Full happy-path route set (7-day forecast by default). */
export function happyRoutes(weather: unknown = weatherBody(7)): Route[] {
  return [
    { match: GEO, respond: () => beijingGeo },
    { match: AMAP_REGEO, respond: () => regeoBody },
    { match: AMAP_TEXT, respond: () => poisBody },
    { match: WEATHER, respond: () => weather },
  ];
}
