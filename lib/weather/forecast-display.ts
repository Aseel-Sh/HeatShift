import type { ForecastHour } from "../domain/types";
import { classifyForecastTemperature,type ForecastTemperatureCategory } from "../domain/temperature-category";

export interface ForecastDisplayPoint{time:string;temperature:number;apparentTemperature:number;category:ForecastTemperatureCategory}
const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
export function filterForecastForShift(hours:readonly ForecastHour[],start:string,end:string):ForecastHour[]{const from=minutes(start),to=minutes(end);return hours.filter(hour=>{const value=minutes(hour.time);return value>=from&&value<to;});}
export function buildForecastDisplayPoints(hours:readonly ForecastHour[]):ForecastDisplayPoint[]{return hours.map(hour=>({time:hour.time,temperature:hour.temperatureCelsius,apparentTemperature:hour.apparentTemperatureCelsius,category:classifyForecastTemperature(hour.temperatureCelsius).category}));}
