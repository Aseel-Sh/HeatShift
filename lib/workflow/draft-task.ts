import type { ActivityKind, RecoveryEligibility, TimingPreference, WorkEnvironment, WorkTask, Workload } from "../domain/types";
import type { FieldEvidence } from "../ai/structured-plan-parser";

export interface DraftWorkTask {
  id: string;
  nameEn: string;
  nameAr: string;
  activityKind?: ActivityKind;
  durationMinutes: number | null;
  workload: Workload | "";
  environment: WorkEnvironment | "";
  splittable: boolean | null;
  requestedStart?: string;
  requestedEnd?: string;
  recoveryEligibility?: RecoveryEligibility;
  mustSchedule?: boolean;
  operationalNotes?: string[];
  timingPreference?: TimingPreference;
  suggestedWorkload?: Workload;
  suggestedEnvironment?: WorkEnvironment;
  suggestedSplittable?: boolean;
  evidence?: Record<string, FieldEvidence>;
}

export function toWorkTasks(tasks: readonly DraftWorkTask[]): WorkTask[] {
  return tasks.filter((task) => (task.activityKind ?? "work") === "work").map((task) => {
    if (
      task.durationMinutes === null ||
      !task.workload ||
      !task.environment ||
      task.splittable === null
    ) {
      throw new Error(`Draft task ${task.id} is incomplete.`);
    }
    return {
      ...task,
      durationMinutes: task.durationMinutes,
      workload: task.workload,
      environment: task.environment,
      splittable: task.splittable,
      activityKind: "work",
      mustSchedule: task.mustSchedule,
      operationalNotes: task.operationalNotes ?? [],
      timingPreference: task.timingPreference ?? "flexible",
      requestedStart: task.requestedStart || undefined,
      requestedEnd: task.requestedEnd || undefined,
    };
  });
}

export function fromWorkTask(task: WorkTask): DraftWorkTask {
  return {
    ...task,
    activityKind: "work",
    recoveryEligibility: "unknown",
    mustSchedule: task.mustSchedule ?? false,
    operationalNotes: task.operationalNotes ?? [],
    timingPreference: task.timingPreference ?? "flexible",
  };
}
