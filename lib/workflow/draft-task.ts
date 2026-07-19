import type { ActivityKind, RecoveryEligibility, ScheduleActivity, TimingPreference, WorkEnvironment, WorkTask, Workload } from "../domain/types";
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
  predecessorTaskIds?: string[];
  suggestedWorkload?: Workload;
  suggestedEnvironment?: WorkEnvironment;
  suggestedSplittable?: boolean;
  evidence?: Record<string, FieldEvidence>;
}

export function toScheduleActivities(tasks:readonly DraftWorkTask[]):ScheduleActivity[]{
  return tasks.map((task)=>{
    if(task.durationMinutes===null)throw new Error(`Draft task ${task.id} is incomplete.`);
    const activityKind=task.activityKind??"work";
    if(activityKind!=="work")return {
      id:task.id,nameEn:task.nameEn,nameAr:task.nameAr,durationMinutes:task.durationMinutes,
      activityKind,recoveryEligibility:task.recoveryEligibility??"unknown",
      timingPreference:task.timingPreference??"flexible",requestedStart:task.requestedStart||undefined,
      requestedEnd:task.requestedEnd||undefined,mustSchedule:task.mustSchedule,
      operationalNotes:task.operationalNotes??[],predecessorTaskIds:task.predecessorTaskIds??[],
    };
    if (
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
      predecessorTaskIds:task.predecessorTaskIds??[],
    };
  });
}

export function toWorkTasks(tasks: readonly DraftWorkTask[]): WorkTask[] {
  return toScheduleActivities(tasks).filter((task):task is WorkTask=>(task.activityKind??"work")==="work");
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

export function fromScheduleActivity(task:ScheduleActivity):DraftWorkTask{
  if((task.activityKind??"work")==="work")return fromWorkTask(task as WorkTask);
  return {...task,workload:"",environment:"",splittable:null};
}
