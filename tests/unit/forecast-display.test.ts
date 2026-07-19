import { describe,expect,it } from "vitest";
import { buildForecastDisplayPoints,filterForecastForShift } from "../../lib/weather/forecast-display";
import { forecastAtOrBefore } from "../../lib/domain/forecast";
import type { ForecastHour } from "../../lib/domain/types";
const hours:ForecastHour[]=[{time:"06:00",temperatureCelsius:30,apparentTemperatureCelsius:31,relativeHumidityPercent:30,windSpeedKph:8},{time:"07:00",temperatureCelsius:35,apparentTemperatureCelsius:37,relativeHumidityPercent:28,windSpeedKph:9},{time:"15:00",temperatureCelsius:48,apparentTemperatureCelsius:51,relativeHumidityPercent:20,windSpeedKph:10}];
describe("forecast display and slot lookup",()=>{
  it("uses the latest hourly point at or before a 06:30 slot",()=>expect(forecastAtOrBefore(hours,"06:30")?.time).toBe("06:00"));
  it("keeps shift display and peaks separate from full-day lookup data",()=>expect(filterForecastForShift(hours,"06:30","08:00").map(hour=>hour.time)).toEqual(["07:00"]));
  it("prepares normalized temperature-ribbon points",()=>expect(buildForecastDisplayPoints(hours)[0]).toEqual({time:"06:00",temperature:30,apparentTemperature:31,category:"low"}));
});
