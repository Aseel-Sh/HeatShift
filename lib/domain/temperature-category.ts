import { SOURCE_IDS } from "../../data/official-sources";

export type ForecastTemperatureCategory =
  | "low"
  | "intermediate"
  | "high"
  | "high_risk";

export interface ForecastTemperatureCategoryResult {
  category: ForecastTemperatureCategory;
  sourceId: typeof SOURCE_IDS.temperatureIndicator;
}

export function classifyForecastTemperature(
  temperatureCelsius: number,
): ForecastTemperatureCategoryResult {
  let category: ForecastTemperatureCategory;

  if (temperatureCelsius < 32.7) {
    category = "low";
  } else if (temperatureCelsius < 39.4) {
    category = "intermediate";
  } else if (temperatureCelsius <= 46.1) {
    category = "high";
  } else {
    category = "high_risk";
  }

  return { category, sourceId: SOURCE_IDS.temperatureIndicator };
}
