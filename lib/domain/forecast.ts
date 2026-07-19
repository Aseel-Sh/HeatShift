import type { ForecastHour } from "./types";
const minutes=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
export function forecastAtOrBefore(hours:readonly ForecastHour[],time:string):ForecastHour|null{return [...hours].sort((a,b)=>minutes(a.time)-minutes(b.time)).filter(hour=>minutes(hour.time)<=minutes(time)).at(-1)??null;}
