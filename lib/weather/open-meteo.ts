import { z } from "zod";
import { SAUDI_CITIES } from "../../data/cities";
import { forecastHourSchema, type ForecastHour, type SaudiCity } from "../domain/types";
import { IntegrationError } from "../server/api-errors";
import { SAUDI_TIME_ZONE } from "../i18n/saudi-time";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TIMEOUT_MS = 8_000;

export const weatherQuerySchema = z.object({
  latitude: z.coerce.number().min(16).max(33),
  longitude: z.coerce.number().min(34).max(56),
  date: z.iso.date(),
  timezone: z.literal(SAUDI_TIME_ZONE),
  locationName: z.string().trim().min(1).max(160),
});

const openMeteoResponseSchema = z.object({
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    apparent_temperature: z.array(z.number()),
    relative_humidity_2m: z.array(z.number()),
    wind_speed_10m: z.array(z.number()),
  }),
});

export interface WeatherServiceOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function normalizeOpenMeteoResponse(
  payload: unknown,
  date: string,
): ForecastHour[] {
  const parsed = openMeteoResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new IntegrationError(
      "WEATHER_UNAVAILABLE",
      "Weather data is temporarily unavailable.",
      502,
    );
  }

  const hourly = parsed.data.hourly;
  const length = hourly.time.length;
  if (length === 0) {
    throw new IntegrationError(
      "WEATHER_EMPTY_FORECAST",
      "Weather service returned no forecast data.",
      502,
    );
  }
  if (
    hourly.temperature_2m.length !== length ||
    hourly.apparent_temperature.length !== length ||
    hourly.relative_humidity_2m.length !== length ||
    hourly.wind_speed_10m.length !== length
  ) {
    throw new IntegrationError(
      "WEATHER_UNAVAILABLE",
      "Weather data is temporarily unavailable.",
      502,
    );
  }

  const hours: ForecastHour[] = [];
  hourly.time.forEach((time, index) => {
    if (!time.startsWith(`${date}T`)) return;
    const candidate = forecastHourSchema.safeParse({
      time: time.slice(11, 16),
      temperatureCelsius: hourly.temperature_2m[index],
      apparentTemperatureCelsius: hourly.apparent_temperature[index],
      relativeHumidityPercent: hourly.relative_humidity_2m[index],
      windSpeedKph: hourly.wind_speed_10m[index],
    });
    if (!candidate.success) {
      throw new IntegrationError(
        "WEATHER_UNAVAILABLE",
        "Weather data is temporarily unavailable.",
        502,
      );
    }
    hours.push(candidate.data);
  });

  if (hours.length === 0) {
    throw new IntegrationError(
      "WEATHER_DATE_UNAVAILABLE",
      "The requested date is outside the available forecast range.",
      422,
    );
  }
  return hours;
}

export async function fetchCityWeather(
  city: SaudiCity,
  date: string,
  options: WeatherServiceOptions = {},
): Promise<ForecastHour[]> {
  const cityRecord = SAUDI_CITIES[city];
  return fetchLocationWeather({latitude:cityRecord.latitude,longitude:cityRecord.longitude,timezone:SAUDI_TIME_ZONE,date},options);
}

export interface CoordinateWeatherRequest { latitude:number; longitude:number; timezone:string; date:string }

export async function fetchLocationWeather(
  request:CoordinateWeatherRequest,
  options: WeatherServiceOptions = {},
): Promise<ForecastHour[]> {
  const parameters = new URLSearchParams({
    latitude: String(request.latitude),
    longitude: String(request.longitude),
    hourly:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m",
    timezone: request.timezone,
    start_date: request.date,
    end_date: request.date,
  });
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const response = await (options.fetchImpl ?? fetch)(
      `${OPEN_METEO_URL}?${parameters.toString()}`,
      { signal: controller.signal },
    );
    if (!response.ok) {
      if (response.status === 400) {
        throw new IntegrationError(
          "WEATHER_DATE_UNAVAILABLE",
          "The requested date is outside the available forecast range.",
          422,
        );
      }
      throw new IntegrationError(
        "WEATHER_UNAVAILABLE",
        "Weather data is temporarily unavailable.",
        502,
      );
    }
    return normalizeOpenMeteoResponse(await response.json(), request.date);
  } catch (error) {
    if (error instanceof IntegrationError) throw error;
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw new IntegrationError(
        "WEATHER_TIMEOUT",
        "Weather request timed out.",
        504,
      );
    }
    throw new IntegrationError(
      "WEATHER_UNAVAILABLE",
      "Weather data is temporarily unavailable.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
