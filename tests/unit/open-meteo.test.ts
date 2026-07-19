import { describe, expect, it, vi } from "vitest";
import {
  fetchCityWeather,
  normalizeOpenMeteoResponse,
} from "../../lib/weather/open-meteo";

const validPayload = {
  hourly: {
    time: ["2026-07-20T06:00", "2026-07-20T07:00"],
    temperature_2m: [31.2, 33.4],
    apparent_temperature: [33.1, 35.8],
    relative_humidity_2m: [35, 33],
    wind_speed_10m: [8.2, 9.1],
  },
};

describe("Open-Meteo weather integration", () => {
  it("normalizes Open-Meteo hourly arrays into ForecastHour values", () => {
    expect(normalizeOpenMeteoResponse(validPayload, "2026-07-20")).toEqual([
      {
        time: "06:00",
        temperatureCelsius: 31.2,
        apparentTemperatureCelsius: 33.1,
        relativeHumidityPercent: 35,
        windSpeedKph: 8.2,
      },
      {
        time: "07:00",
        temperatureCelsius: 33.4,
        apparentTemperatureCelsius: 35.8,
        relativeHumidityPercent: 33,
        windSpeedKph: 9.1,
      },
    ]);
  });

  it("does not fabricate forecast data when Open-Meteo fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ reason: "service unavailable" }), {
        status: 503,
      }),
    );

    await expect(
      fetchCityWeather("riyadh", "2026-07-20", {
        fetchImpl: fetchImpl as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "WEATHER_UNAVAILABLE", status: 502 });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects malformed hourly values instead of silently dropping them", () => {
    expect(() =>
      normalizeOpenMeteoResponse(
        {
          ...validPayload,
          hourly: {
            ...validPayload.hourly,
            relative_humidity_2m: [140, 33],
          },
        },
        "2026-07-20",
      ),
    ).toThrowError(expect.objectContaining({ code: "WEATHER_UNAVAILABLE" }));
  });

  it("distinguishes empty forecasts and unavailable dates", () => {
    expect(() =>
      normalizeOpenMeteoResponse(
        {
          hourly: {
            time: [],
            temperature_2m: [],
            apparent_temperature: [],
            relative_humidity_2m: [],
            wind_speed_10m: [],
          },
        },
        "2026-07-20",
      ),
    ).toThrowError(expect.objectContaining({ code: "WEATHER_EMPTY_FORECAST" }));
    expect(() =>
      normalizeOpenMeteoResponse(validPayload, "2026-07-21"),
    ).toThrowError(expect.objectContaining({ code: "WEATHER_DATE_UNAVAILABLE" }));
  });

  it("aborts weather requests that exceed the timeout", async () => {
    const fetchImpl = vi.fn((_url: URL | RequestInfo, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    );

    await expect(
      fetchCityWeather("riyadh", "2026-07-20", {
        fetchImpl: fetchImpl as typeof fetch,
        timeoutMs: 1,
      }),
    ).rejects.toMatchObject({ code: "WEATHER_TIMEOUT", status: 504 });
  });
});
