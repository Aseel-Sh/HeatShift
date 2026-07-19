import { SOURCE_IDS } from "../../data/official-sources";
import { evaluateMiddayRestriction } from "./midday-restriction";
import { getWorkRestGuidance } from "./twl-guidance";
import { isWorkActivity,type ConflictSeverity, type ScheduleActivity, type ShiftPlan, type SiteConditions } from "./types";

export interface OriginalPlanConflict {
  id: string;
  severity: ConflictSeverity;
  code: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  taskIds: string[];
  sourceId: string;
}

const STRUCTURE_SOURCE = "heatshift-original-plan-evaluator";
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && bStart < aEnd;

function finding(task: ScheduleActivity, code: string, severity: ConflictSeverity, titleEn: string, descriptionEn: string, sourceId = STRUCTURE_SOURCE): OriginalPlanConflict {
  return { id: `${code.toLowerCase()}-${task.id}`, severity, code, titleEn, titleAr: titleEn, descriptionEn, descriptionAr: descriptionEn, taskIds: [task.id], sourceId };
}

export function evaluateOriginalPlan(plan: ShiftPlan, conditions: SiteConditions): OriginalPlanConflict[] {
  const findings: OriginalPlanConflict[] = [];
  const shiftStart = minutes(plan.shiftStart);
  const shiftEnd = minutes(plan.shiftEnd);

  if (plan.tasks.reduce((sum, task) => sum + task.durationMinutes, 0) > shiftEnd - shiftStart) {
    findings.push({
      id: "original-work-exceeds-shift", severity: "critical", code: "ORIGINAL_WORK_EXCEEDS_SHIFT",
      titleEn: "Requested work exceeds shift length", titleAr: "Requested work exceeds shift length",
      descriptionEn: "The total requested task duration is longer than the available shift.", descriptionAr: "The total requested task duration is longer than the available shift.",
      taskIds: plan.tasks.map((task) => task.id), sourceId: STRUCTURE_SOURCE,
    });
  }

  const timed: Array<{ task: ScheduleActivity; start: number; end: number }> = [];
  for (const task of plan.tasks) {
    if (!task.requestedStart || !task.requestedEnd) {
      findings.push(finding(task, "ORIGINAL_TIME_MISSING", "info", "Original time not stated", "No complete requested time was provided, so time-specific original-plan checks are preliminary."));
      continue;
    }
    const start = minutes(task.requestedStart);
    const end = minutes(task.requestedEnd);
    timed.push({ task, start, end });
    if (start < shiftStart || end > shiftEnd || end <= start) {
      findings.push(finding(task, "ORIGINAL_TASK_OUTSIDE_SHIFT", "critical", "Requested task is outside the shift", "The requested task interval is not fully inside the shift."));
    }
    if (end - start < task.durationMinutes) {
      findings.push(finding(task, "ORIGINAL_INTERVAL_TOO_SHORT", "critical", "Requested interval is too short", "The requested interval is shorter than the task duration."));
    }
    if (isWorkActivity(task) &&
      task.environment === "direct_sun" &&
      evaluateMiddayRestriction({ date: plan.shiftDate, time: "12:00", environment: task.environment }).seasonActive &&
      overlap(start, end, 12 * 60, 15 * 60)
    ) {
      findings.push(finding(task, "ORIGINAL_MIDDAY_DIRECT_SUN", "critical", "Direct-sun work requested during the midday restriction", "The original requested interval overlaps 12:00–15:00 during the active season.", SOURCE_IDS.middayRestriction));
    }
    if (isWorkActivity(task) && conditions.twlZone !== "none" && task.environment !== "conditioned_indoor") {
      const guidance = getWorkRestGuidance(conditions.twlZone, task.workload);
      if (guidance.kind === "cycle") {
        const rests = Math.max(0, Math.ceil(task.durationMinutes / guidance.workMinutes) - 1);
        const requiredElapsed = task.durationMinutes + rests * guidance.restMinutes;
        if (end - start < requiredElapsed) {
          findings.push(finding(task, "ORIGINAL_TWL_CYCLE_INCOMPATIBLE", "warning", "Requested interval cannot contain the selected work/rest cycle", `The selected TWL guidance requires at least ${requiredElapsed} elapsed minutes for this task.`, guidance.sourceId));
        }
      }
    }
  }

  for (let left = 0; left < timed.length; left += 1) {
    for (let right = left + 1; right < timed.length; right += 1) {
      const a = timed[left]; const b = timed[right];
      if (overlap(a.start, a.end, b.start, b.end)) {
        findings.push({ id: `original-overlap-${a.task.id}-${b.task.id}`, severity: "critical", code: "ORIGINAL_TASK_OVERLAP", titleEn: "Requested tasks overlap", titleAr: "Requested tasks overlap", descriptionEn: "The original plan assigns overlapping work to the single crew.", descriptionAr: "The original plan assigns overlapping work to the single crew.", taskIds: [a.task.id, b.task.id], sourceId: STRUCTURE_SOURCE });
      }
    }
  }
  return findings;
}
