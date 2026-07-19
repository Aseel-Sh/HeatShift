import { forecastAtOrBefore } from "../domain/forecast";
import type { ScheduleBlock, ScheduleResult } from "../domain/scheduler-types";
import type { ForecastHour, ScheduleActivity, ShiftPlan } from "../domain/types";
import { buildForecastDisplayPoints, type ForecastDisplayPoint } from "../weather/forecast-display";

export const timeToMinutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function associatedBlocks(result: ScheduleResult, activityId: string): ScheduleBlock[] {
  return result.blocks
    .filter((block) => block.type !== "restriction" && block.taskId === activityId)
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

export function idleBlocks(plan: ShiftPlan, result: ScheduleResult): ScheduleBlock[] {
  const shiftStart = timeToMinutes(plan.shiftStart);
  const shiftEnd = timeToMinutes(plan.shiftEnd);
  const occupied = result.blocks
    .filter((block) => block.type !== "restriction")
    .map((block) => ({ start: timeToMinutes(block.start), end: timeToMinutes(block.end) }))
    .sort((a, b) => a.start - b.start);
  const gaps: ScheduleBlock[] = [];
  let cursor = shiftStart;
  for (const interval of occupied) {
    if (interval.start > cursor) {
      gaps.push({ id: `idle-${cursor}`, type: "rest", start: minutesToTime(cursor), end: minutesToTime(interval.start), labelEn: "Idle gap", labelAr: "فترة غير مستخدمة", reasonCodes: ["AVAILABLE_CREW_CAPACITY"] });
    }
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < shiftEnd) gaps.push({ id: `idle-${cursor}`, type: "rest", start: minutesToTime(cursor), end: minutesToTime(shiftEnd), labelEn: "Idle gap", labelAr: "فترة غير مستخدمة", reasonCodes: ["AVAILABLE_CREW_CAPACITY"] });
  return gaps;
}

export function forecastRibbonPoints(
  forecast: readonly ForecastHour[],
  shiftStart: string,
  shiftEnd: string,
): ForecastDisplayPoint[] {
  const start = timeToMinutes(shiftStart);
  const end = timeToMinutes(shiftEnd);
  const preceding = forecastAtOrBefore(forecast, shiftStart);
  const selected = forecast.filter((hour) => {
    const minute = timeToMinutes(hour.time);
    return minute >= start && minute < end;
  });
  const hours = preceding && !selected.some((hour) => hour.time === preceding.time)
    ? [preceding, ...selected]
    : selected;
  return buildForecastDisplayPoints(hours);
}

export function activityType(activity: ScheduleActivity): "work" | "break" | "meal" {
  return activity.activityKind === "break" || activity.activityKind === "meal"
    ? activity.activityKind
    : "work";
}

export function requestedInterval(activity: ScheduleActivity): string | null {
  return activity.requestedStart && activity.requestedEnd
    ? `${activity.requestedStart}–${activity.requestedEnd}`
    : null;
}
