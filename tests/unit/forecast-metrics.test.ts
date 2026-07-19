import { describe,expect,it } from "vitest";
import { generateSchedule } from "../../lib/domain/scheduler";
import type { ForecastHour,ShiftPlan } from "../../lib/domain/types";
import { SAUDI_LOCATION_PRESETS } from "../../data/cities";

const forecasts:ForecastHour[]=[
  {time:"06:00",temperatureCelsius:25,apparentTemperatureCelsius:26,relativeHumidityPercent:40,windSpeedKph:8},
  {time:"07:00",temperatureCelsius:28,apparentTemperatureCelsius:30,relativeHumidityPercent:38,windSpeedKph:8},
  {time:"08:00",temperatureCelsius:31,apparentTemperatureCelsius:34,relativeHumidityPercent:35,windSpeedKph:9},
  {time:"12:00",temperatureCelsius:42,apparentTemperatureCelsius:45,relativeHumidityPercent:25,windSpeedKph:10},
  {time:"15:00",temperatureCelsius:47,apparentTemperatureCelsius:50,relativeHumidityPercent:20,windSpeedKph:11},
  {time:"16:00",temperatureCelsius:44,apparentTemperatureCelsius:47,relativeHumidityPercent:22,windSpeedKph:10},
];
const plan=(shiftStart:string,shiftEnd:string):ShiftPlan=>({siteName:"Site",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart,shiftEnd,crewSize:2,nonAcclimatizedWorkers:0,tasks:[]});

describe("shift-scoped forecast metrics",()=>{
  it.each([
    ["early","06:00","09:00",31,34],
    ["midday","11:00","14:00",42,45],
    ["late","15:00","17:00",47,50],
    ["missing exact boundary","06:30","08:30",31,34],
  ] as const)("uses only %s shift forecast points",(_name,start,end,temperature,apparent)=>{
    const result=generateSchedule(plan(start,end),{measurementMode:"forecast",twlZone:"none"},forecasts);
    expect(result.metrics).toMatchObject({peakForecastTemperature:temperature,peakApparentTemperature:apparent});
  });
  it("returns null when every forecast point is outside the shift",()=>{
    const result=generateSchedule(plan("09:00","10:00"),{measurementMode:"forecast",twlZone:"none"},forecasts);
    expect(result.metrics).toMatchObject({peakForecastTemperature:null,peakApparentTemperature:null});
  });
});
