import { describe, expect, it } from "vitest";
import { SOURCE_IDS } from "../../data/official-sources";
import { classifyForecastTemperature } from "../../lib/domain/temperature-category";

describe("forecast temperature categories", () => {
  it.each([
    [32.699, "low"],
    [32.7, "intermediate"],
    [39.399, "intermediate"],
    [39.4, "high"],
    [46.1, "high"],
    [46.101, "high_risk"],
  ] as const)("classifies %d Celsius as %s", (temperature, category) => {
    expect(classifyForecastTemperature(temperature)).toEqual({
      category,
      sourceId: SOURCE_IDS.temperatureIndicator,
    });
  });
});
