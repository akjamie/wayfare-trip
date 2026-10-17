import { describe, it, expect } from "vitest";
import { loadConfig, DEFAULT_AMAP_TYPES } from "../src/config.js";

describe("config", () => {
  it("returns the documented defaults when the environment is empty", () => {
    const cfg = loadConfig({} as Record<string, string>, {});
    expect(cfg.amapKey).toBe("");
    expect(cfg.amapTypes).toBe(DEFAULT_AMAP_TYPES);
    expect(cfg.rainProbThreshold).toBe(50);
    expect(cfg.highTempC).toBe(33);
    expect(cfg.noonStart).toBe(11);
    expect(cfg.noonEnd).toBe(15);
    expect(cfg.forecastDays).toBe(7);
    expect(cfg.topN).toBe(10);
    expect(cfg.cacheTtlMs).toBe(24 * 60 * 60 * 1000);
    expect(cfg.timeoutMs).toBe(3000);
  });

  it("honors env overrides and parses 'HH:mm' noon bounds", () => {
    const cfg = loadConfig(
      {
        WAYFARE_HIGH_TEMP_C: "35",
        WAYFARE_NOON_START: "12:00",
        WAYFARE_NOON_END: "14:30",
        WAYFARE_RAIN_PROB: "70",
        WAYFARE_FORECAST_DAYS: "3",
        WAYFARE_TOP_N: "5",
      } as Record<string, string>,
      {},
    );
    expect(cfg.highTempC).toBe(35);
    expect(cfg.noonStart).toBe(12);
    expect(cfg.noonEnd).toBe(14);
    expect(cfg.rainProbThreshold).toBe(70);
    expect(cfg.forecastDays).toBe(3);
    expect(cfg.topN).toBe(5);
  });

  it("accepts AMAP_API_KEY as an alias for AMAP_KEY (AMAP_KEY wins)", () => {
    expect(loadConfig({ AMAP_API_KEY: "abc" } as Record<string, string>, {}).amapKey).toBe("abc");
    expect(
      loadConfig({ AMAP_KEY: "xyz", AMAP_API_KEY: "abc" } as Record<string, string>, {}).amapKey,
    ).toBe("xyz");
  });

  it("falls back to defaults on non-numeric input", () => {
    const cfg = loadConfig({ WAYFARE_HIGH_TEMP_C: "hot" } as Record<string, string>, {});
    expect(cfg.highTempC).toBe(33);
  });
});
