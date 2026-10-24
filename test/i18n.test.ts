import { describe, it, expect } from "vitest";
import {
  CATALOGS,
  DEFAULT_LANG,
  resolveLang,
  t,
  weatherText,
} from "../src/i18n.js";

describe("i18n", () => {
  it("AC7: en and zh-CN catalogs define the same keys", () => {
    const en = Object.keys(CATALOGS.en).sort();
    const zh = Object.keys(CATALOGS["zh-CN"]).sort();
    expect(zh).toEqual(en);
  });

  it("AC7/AC9: default + unsupported -> en; zh selects zh-CN; Accept-Language fallback", () => {
    expect(resolveLang(null, null)).toBe("en");
    expect(resolveLang("en", null)).toBe("en");
    expect(resolveLang("zh-CN", null)).toBe("zh-CN");
    expect(resolveLang("zh", null)).toBe("zh-CN");
    expect(resolveLang("fr", null)).toBe("en"); // unsupported -> en
    expect(resolveLang(null, "zh-CN,zh;q=0.9")).toBe("zh-CN");
    expect(resolveLang(null, "en-US,en;q=0.9")).toBe("en");
    expect(DEFAULT_LANG).toBe("en");
  });

  it("AC7: interpolates and resolves WMO weather text in both locales", () => {
    expect(t("en", "advice.rain")).toContain("indoor");
    expect(t("zh-CN", "advice.rain")).toContain("室内");
    expect(
      t("en", "advice.weather", { weather: "Sunny", min: 10, max: 20, precip: 5 }),
    ).toContain("Sunny");
    expect(
      t("zh-CN", "advice.weather", { weather: "晴", min: 10, max: 20, precip: 5 }),
    ).toContain("晴");
    expect(weatherText("en", 61)).toBe("Slight rain");
    expect(weatherText("zh-CN", 61)).toBe("小雨");
  });

  it("AC18: hotel/route labels are localized in both catalogs", () => {
    expect(t("en", "hotel.star", { n: 4 })).toContain("4");
    expect(t("zh-CN", "hotel.star", { n: 4 })).toContain("4");
    expect(t("en", "notice.no_hotel_data").length).toBeGreaterThan(0);
    expect(t("zh-CN", "notice.no_hotel_data").length).toBeGreaterThan(0);
    expect(t("en", "route.mode.walk")).not.toBe(t("zh-CN", "route.mode.walk"));
  });
});
