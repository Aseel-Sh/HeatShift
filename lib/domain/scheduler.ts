import type { Conflict, ForecastHour, ShiftPlan, SiteConditions, WorkTask } from "./types";
import type { ScheduleBlock, ScheduleResult, UnscheduledTask } from "./scheduler-types";
import { evaluateMiddayRestriction } from "./midday-restriction";
import { getLoneWorkConflict, getNonAcclimatizedConflict } from "./twl-conflicts";
import { getHydrationGuidance, getWorkRestGuidance } from "./twl-guidance";

const SLOT_MINUTES = 5;
const CAPACITY_SOURCE_ID = "heatshift-scheduler-capacity";

interface Slot {
  startMinutes: number;
  occupiedByTaskId?: string;
  restForTaskId?: string;
}

const priorityByTask: Record<`${WorkTask["environment"]}_${WorkTask["workload"]}`, number> = {
  direct_sun_heavy: 0,
  direct_sun_light: 1,
  shaded_outdoor_heavy: 2,
  shaded_outdoor_light: 3,
  indoor_heavy: 4,
  indoor_light: 5,
};

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildSlots(start: number, end: number): Slot[] {
  const slots: Slot[] = [];
  for (let minute = start; minute + SLOT_MINUTES <= end; minute += SLOT_MINUTES) {
    slots.push({ startMinutes: minute });
  }
  return slots;
}

function taskPriority(task: WorkTask): number {
  return priorityByTask[`${task.environment}_${task.workload}`];
}

function workReasonCodes(
  task: WorkTask,
  restrictionActive: boolean,
  forecastAvailable: boolean,
): string[] {
  const codes = [
    `TASK_PRIORITY_${task.environment.toUpperCase()}_${task.workload.toUpperCase()}`,
    "FIVE_MINUTE_SLOT",
  ];
  if (restrictionActive && task.environment === "direct_sun") {
    codes.push("MIDDAY_RESTRICTION_AVOIDED");
  }
  if (restrictionActive && task.environment === "indoor") {
    codes.push("INDOOR_MIDDAY_PREFERENCE");
  }
  if (forecastAvailable && task.environment === "direct_sun") {
    codes.push("COOLER_FORECAST_SLOT");
  }
  return codes;
}

function forecastTemperatureAt(
  minute: number,
  forecastHours: readonly ForecastHour[],
): number {
  if (forecastHours.length === 0) return Number.POSITIVE_INFINITY;

  let selected = forecastHours[0];
  for (const forecast of forecastHours) {
    if (timeToMinutes(forecast.time) > minute) break;
    selected = forecast;
  }
  return selected.temperatureCelsius;
}

function cycleReasonCode(task: WorkTask, twlZone: SiteConditions["twlZone"]): string {
  return `TWL_${twlZone.toUpperCase()}_${task.workload.toUpperCase()}_WORK_REST`;
}

function buildWorkRestPattern(
  requiredWorkSlots: number,
  maximumWorkSlots: number,
  restSlots: number,
  appendFinalRest: boolean,
): Array<"work" | "rest"> {
  const pattern: Array<"work" | "rest"> = [];
  let remainingWorkSlots = requiredWorkSlots;

  while (remainingWorkSlots > 0) {
    const workSlots = Math.min(remainingWorkSlots, maximumWorkSlots);
    pattern.push(...Array<"work">(workSlots).fill("work"));
    remainingWorkSlots -= workSlots;
    if (remainingWorkSlots > 0) {
      pattern.push(...Array<"rest">(restSlots).fill("rest"));
    }
  }

  if (appendFinalRest) {
    pattern.push(...Array<"rest">(restSlots).fill("rest"));
  }

  return pattern;
}

function buildWorkBlocks(
  slots: Slot[],
  tasksById: ReadonlyMap<string, WorkTask>,
  restrictionActive: boolean,
  twlZone: SiteConditions["twlZone"],
  forecastAvailable: boolean,
): ScheduleBlock[] {
  const blocks: ScheduleBlock[] = [];
  let blockStart = 0;

  while (blockStart < slots.length) {
    const slotType = slots[blockStart].occupiedByTaskId
      ? "work"
      : slots[blockStart].restForTaskId
        ? "rest"
        : undefined;
    const taskId =
      slots[blockStart].occupiedByTaskId ?? slots[blockStart].restForTaskId;
    if (!taskId || !slotType) {
      blockStart += 1;
      continue;
    }

    let blockEnd = blockStart + 1;
    while (
      blockEnd < slots.length &&
      (slotType === "work"
        ? slots[blockEnd].occupiedByTaskId === taskId
        : slots[blockEnd].restForTaskId === taskId)
    ) {
      blockEnd += 1;
    }

    const task = tasksById.get(taskId);
    if (!task) throw new Error(`Unknown scheduled task: ${taskId}`);
    const isRest = slotType === "rest";
    const reasonCodes = isRest
      ? ["CREW_REST", cycleReasonCode(task, twlZone)]
      : workReasonCodes(task, restrictionActive, forecastAvailable);
    if (!isRest && getWorkRestGuidance(twlZone, task.workload).kind === "cycle") {
      reasonCodes.push(cycleReasonCode(task, twlZone));
    }
    blocks.push({
      id: `${slotType}-${task.id}-${minutesToTime(slots[blockStart].startMinutes)}`,
      taskId: task.id,
      type: slotType,
      start: minutesToTime(slots[blockStart].startMinutes),
      end: minutesToTime(slots[blockEnd - 1].startMinutes + SLOT_MINUTES),
      labelEn: isRest ? `Crew rest after ${task.nameEn}` : task.nameEn,
      labelAr: isRest ? `راحة الطاقم بعد ${task.nameAr}` : task.nameAr,
      workload: task.workload,
      environment: isRest ? undefined : task.environment,
      reasonCodes,
    });
    blockStart = blockEnd;
  }

  return blocks;
}

function insufficientCapacityConflict(task: WorkTask, minutes: number): Conflict {
  return {
    id: `insufficient-safe-capacity-${task.id}`,
    severity: "critical",
    code: "INSUFFICIENT_SAFE_CAPACITY",
    titleEn: "Insufficient planning capacity",
    titleAr: "سعة التخطيط غير كافية",
    descriptionEn: `${minutes} minutes of ${task.nameEn} remain unscheduled. Supervisor verification required before revising the safer plan.`,
    descriptionAr: `تعذر جدولة ${minutes} دقيقة من مهمة ${task.nameAr}. يلزم تحقق المشرف قبل مراجعة الخطة الأكثر أمانًا.`,
    taskId: task.id,
    sourceId: CAPACITY_SOURCE_ID,
  };
}

export function generateSchedule(
  shiftPlan: ShiftPlan,
  siteConditions: SiteConditions,
  forecastHours: readonly ForecastHour[],
): ScheduleResult {
  const shiftStart = timeToMinutes(shiftPlan.shiftStart);
  const shiftEnd = timeToMinutes(shiftPlan.shiftEnd);
  const sortedForecast = [...forecastHours].sort(
    (left, right) => timeToMinutes(left.time) - timeToMinutes(right.time),
  );
  const slots = buildSlots(shiftStart, shiftEnd);
  const hasDirectSunWork = shiftPlan.tasks.some(
    (task) => task.environment === "direct_sun",
  );
  const seasonActive = evaluateMiddayRestriction({
    date: shiftPlan.shiftDate,
    time: "12:00",
    environment: "direct_sun",
  }).seasonActive;
  const restrictionActive = seasonActive && hasDirectSunWork;
  const restrictedSlots = new Set<number>();

  if (restrictionActive) {
    slots.forEach((slot, index) => {
      if (slot.startMinutes >= 12 * 60 && slot.startMinutes < 15 * 60) {
        restrictedSlots.add(index);
      }
    });
  }

  const tasks = shiftPlan.tasks
    .map((task, originalIndex) => ({ task, originalIndex }))
    .sort(
      (left, right) =>
        taskPriority(left.task) - taskPriority(right.task) ||
        left.originalIndex - right.originalIndex,
    );
  const unscheduled: UnscheduledTask[] = [];
  const capacityConflicts: Conflict[] = [];

  for (let taskOrderIndex = 0; taskOrderIndex < tasks.length; taskOrderIndex += 1) {
    const { task } = tasks[taskOrderIndex];
    const requiredSlots = Math.ceil(task.durationMinutes / SLOT_MINUTES);
    const isValidSlot = (slot: Slot, index: number) =>
      !slot.occupiedByTaskId &&
      !slot.restForTaskId &&
      !(task.environment === "direct_sun" && restrictedSlots.has(index));
    let scheduledSlots = 0;
    const workRestGuidance = getWorkRestGuidance(
      siteConditions.twlZone,
      task.workload,
    );

    if (workRestGuidance.kind === "cycle") {
      const maximumWorkSlots = workRestGuidance.workMinutes / SLOT_MINUTES;
      const restSlots = workRestGuidance.restMinutes / SLOT_MINUTES;
      const hasFurtherOutdoorWork =
        task.environment !== "indoor" &&
        tasks
          .slice(taskOrderIndex + 1)
          .some(({ task: laterTask }) => laterTask.environment !== "indoor");
      const minimumCandidateSlots = task.splittable ? 1 : requiredSlots;

      for (
        let candidateWorkSlots = requiredSlots;
        candidateWorkSlots >= minimumCandidateSlots && scheduledSlots === 0;
        candidateWorkSlots -= 1
      ) {
        if (!task.splittable && candidateWorkSlots > maximumWorkSlots) break;
        const pattern = buildWorkRestPattern(
          candidateWorkSlots,
          maximumWorkSlots,
          restSlots,
          hasFurtherOutdoorWork,
        );
        const startIndices = slots
          .map((_, index) => index)
          .filter((index) => index + pattern.length <= slots.length)
          .sort((left, right) => {
            if (
              task.environment !== "direct_sun" ||
              sortedForecast.length === 0
            ) {
              return left - right;
            }
            const patternTemperature = (startIndex: number) => {
              const workTemperatures = pattern.flatMap((type, offset) =>
                type === "work"
                  ? [
                      forecastTemperatureAt(
                        slots[startIndex + offset].startMinutes,
                        sortedForecast,
                      ),
                    ]
                  : [],
              );
              return (
                workTemperatures.reduce((total, value) => total + value, 0) /
                workTemperatures.length
              );
            };
            return (
              patternTemperature(left) - patternTemperature(right) || left - right
            );
          });

        for (const startIndex of startIndices) {
          const patternFits = pattern.every((type, offset) => {
            const index = startIndex + offset;
            const slot = slots[index];
            if (slot.occupiedByTaskId || slot.restForTaskId) return false;
            return !(
              type === "work" &&
              task.environment === "direct_sun" &&
              restrictedSlots.has(index)
            );
          });
          if (!patternFits) continue;

          pattern.forEach((type, offset) => {
            const slot = slots[startIndex + offset];
            if (type === "work") {
              slot.occupiedByTaskId = task.id;
              scheduledSlots += 1;
            } else {
              slot.restForTaskId = task.id;
            }
          });
          break;
        }
      }
    } else if (task.splittable) {
      const candidateIndices = slots
        .map((_, index) => index)
        .filter((index) => isValidSlot(slots[index], index))
        .sort((left, right) => {
          if (restrictionActive && task.environment === "indoor") {
            const leftIsMidday = restrictedSlots.has(left);
            const rightIsMidday = restrictedSlots.has(right);
            if (leftIsMidday !== rightIsMidday) return leftIsMidday ? -1 : 1;
          }
          if (task.environment === "direct_sun" && sortedForecast.length > 0) {
            const temperatureDifference =
              forecastTemperatureAt(slots[left].startMinutes, sortedForecast) -
              forecastTemperatureAt(slots[right].startMinutes, sortedForecast);
            if (temperatureDifference !== 0) return temperatureDifference;
          }
          return left - right;
        });
      for (const index of candidateIndices) {
        if (scheduledSlots >= requiredSlots) break;
        slots[index].occupiedByTaskId = task.id;
        scheduledSlots += 1;
      }
    } else {
      const startIndices = slots
        .map((_, index) => index)
        .filter((index) => index + requiredSlots <= slots.length)
        .sort((left, right) => {
          if (restrictionActive && task.environment === "indoor") {
            const middaySlots = (startIndex: number) => {
              let count = 0;
              for (let offset = 0; offset < requiredSlots; offset += 1) {
                if (restrictedSlots.has(startIndex + offset)) count += 1;
              }
              return count;
            };
            const preferenceDifference = middaySlots(right) - middaySlots(left);
            if (preferenceDifference !== 0) return preferenceDifference;
          }
          if (task.environment !== "direct_sun" || sortedForecast.length === 0) {
            return left - right;
          }
          const averageTemperature = (startIndex: number) => {
            let total = 0;
            for (let offset = 0; offset < requiredSlots; offset += 1) {
              total += forecastTemperatureAt(
                slots[startIndex + offset].startMinutes,
                sortedForecast,
              );
            }
            return total / requiredSlots;
          };
          return averageTemperature(left) - averageTemperature(right) || left - right;
        });
      for (const startIndex of startIndices) {
        const candidate = slots.slice(startIndex, startIndex + requiredSlots);
        if (!candidate.every((slot, offset) => isValidSlot(slot, startIndex + offset))) {
          continue;
        }
        candidate.forEach((slot) => {
          slot.occupiedByTaskId = task.id;
        });
        scheduledSlots = requiredSlots;
        break;
      }
    }

    const scheduledMinutes = Math.min(
      task.durationMinutes,
      scheduledSlots * SLOT_MINUTES,
    );
    const unscheduledMinutes = task.durationMinutes - scheduledMinutes;
    if (unscheduledMinutes > 0) {
      unscheduled.push({
        taskId: task.id,
        taskName: task.nameEn,
        unscheduledMinutes,
        reasonCode: "INSUFFICIENT_SAFE_CAPACITY",
      });
      capacityConflicts.push(insufficientCapacityConflict(task, unscheduledMinutes));
    }
  }

  const blocks = buildWorkBlocks(
    slots,
    new Map(shiftPlan.tasks.map((task) => [task.id, task])),
    restrictionActive,
    siteConditions.twlZone,
    sortedForecast.length > 0,
  );
  if (restrictionActive && restrictedSlots.size > 0) {
    const firstIndex = Math.min(...restrictedSlots);
    const lastIndex = Math.max(...restrictedSlots);
    blocks.push({
      id: "restriction-midday-direct-sun",
      type: "restriction",
      start: minutesToTime(slots[firstIndex].startMinutes),
      end: minutesToTime(slots[lastIndex].startMinutes + SLOT_MINUTES),
      labelEn: "Direct-sun work restriction",
      labelAr: "تقييد العمل تحت أشعة الشمس المباشرة",
      reasonCodes: ["SAUDI_MIDDAY_DIRECT_SUN_RESTRICTION"],
    });
  }
  blocks.sort((left, right) => left.start.localeCompare(right.start) || left.id.localeCompare(right.id));

  const ruleConflicts = [
    getNonAcclimatizedConflict(
      siteConditions.twlZone,
      shiftPlan.nonAcclimatizedWorkers,
    ),
    getLoneWorkConflict(siteConditions.twlZone),
  ].filter((conflict): conflict is Conflict => conflict !== null);
  const scheduledWorkMinutes = slots.filter((slot) => slot.occupiedByTaskId).length * SLOT_MINUTES;
  const restMinutes = slots.filter((slot) => slot.restForTaskId).length * SLOT_MINUTES;
  const peakForecastTemperature = forecastHours.length
    ? Math.max(...forecastHours.map((hour) => hour.temperatureCelsius))
    : null;

  return {
    blocks,
    conflicts: [...ruleConflicts, ...capacityConflicts],
    unscheduled,
    metrics: {
      totalShiftMinutes: shiftEnd - shiftStart,
      scheduledWorkMinutes,
      restMinutes,
      restrictionMinutes: restrictedSlots.size * SLOT_MINUTES,
      unscheduledMinutes: unscheduled.reduce(
        (total, task) => total + task.unscheduledMinutes,
        0,
      ),
      peakForecastTemperature,
      hydrationPlanning: {
        twlZone: siteConditions.twlZone,
        light: getHydrationGuidance(siteConditions.twlZone, "light"),
        heavy: getHydrationGuidance(siteConditions.twlZone, "heavy"),
      },
    },
    explanationSummary: `${scheduledWorkMinutes} work minutes scheduled in five-minute slots; ${unscheduled.reduce((total, task) => total + task.unscheduledMinutes, 0)} minutes remain unscheduled.`,
    isPreliminary: siteConditions.twlZone === "none",
  };
}
