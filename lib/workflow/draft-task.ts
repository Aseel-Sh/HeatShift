import type { WorkEnvironment, WorkTask, Workload } from "../domain/types";

export interface DraftWorkTask {
  id: string;
  nameEn: string;
  nameAr: string;
  durationMinutes: number | null;
  workload: Workload | "";
  environment: WorkEnvironment | "";
  splittable: boolean | null;
  requestedStart?: string;
  requestedEnd?: string;
}

export function toWorkTasks(tasks: readonly DraftWorkTask[]): WorkTask[] {
  return tasks.map((task) => {
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
      requestedStart: task.requestedStart || undefined,
      requestedEnd: task.requestedEnd || undefined,
    };
  });
}

export function fromWorkTask(task: WorkTask): DraftWorkTask {
  return { ...task };
}
