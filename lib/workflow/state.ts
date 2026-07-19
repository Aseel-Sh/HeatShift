import type { ExtractedPlan } from "../ai/plan-extraction-schema";
import type { DemoScenario } from "../../data/demo-scenario";
import type {
  ForecastHour,
  SaudiCity,
  SiteConditions,
  WorkTask,
} from "../domain/types";
import type { ScheduleResult } from "../domain/scheduler-types";

export type Language = "en" | "ar";
export type WorkflowStep = "describe" | "verify" | "conditions" | "results";

export interface PlanForm {
  siteName: string;
  city: SaudiCity | "";
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  crewSize: string;
  nonAcclimatizedWorkers: string;
  planText: string;
}

export type FormErrors = Record<string, string>;

export interface WorkflowState {
  language: Language;
  step: WorkflowStep;
  plan: PlanForm;
  tasks: WorkTask[];
  assumptions: string[];
  missingInformation: string[];
  conditions: SiteConditions;
  forecast: ForecastHour[];
  weatherStatus: "idle" | "loading" | "success" | "error";
  weatherError: string | null;
  aiStatus: "idle" | "loading" | "error";
  aiError: string | null;
  errors: FormErrors;
  isDemo: boolean;
  scheduleResult: ScheduleResult | null;
}

export type WorkflowAction =
  | { type: "setLanguage"; language: Language }
  | { type: "setPlanField"; field: keyof PlanForm; value: string }
  | { type: "setStep"; step: WorkflowStep }
  | { type: "setErrors"; errors: FormErrors }
  | { type: "setAiStatus"; status: WorkflowState["aiStatus"]; error?: string }
  | { type: "applyExtraction"; extraction: ExtractedPlan }
  | { type: "loadDemo"; demo: DemoScenario }
  | { type: "addTask" }
  | {
      type: "updateTask";
      id: string;
      field: keyof Omit<WorkTask, "id">;
      value: WorkTask[keyof Omit<WorkTask, "id">];
    }
  | { type: "removeTask"; id: string }
  | { type: "setConditions"; conditions: SiteConditions }
  | { type: "weatherLoading" }
  | { type: "weatherSuccess"; forecast: ForecastHour[] }
  | { type: "weatherError"; error: string }
  | { type: "setScheduleResult"; result: ScheduleResult }
  | { type: "startOver" };

export function createInitialWorkflowState(): WorkflowState {
  return {
    language: "en",
    step: "describe",
    plan: {
      siteName: "",
      city: "",
      shiftDate: "",
      shiftStart: "06:30",
      shiftEnd: "16:30",
      crewSize: "",
      nonAcclimatizedWorkers: "0",
      planText: "",
    },
    tasks: [],
    assumptions: [],
    missingInformation: [],
    conditions: { measurementMode: "forecast", twlZone: "none" },
    forecast: [],
    weatherStatus: "idle",
    weatherError: null,
    aiStatus: "idle",
    aiError: null,
    errors: {},
    isDemo: false,
    scheduleResult: null,
  };
}

function keepManual(current: string, extracted: string | number | undefined): string {
  return current.trim() || (extracted === undefined ? "" : String(extracted));
}

export function workflowReducer(
  state: WorkflowState,
  action: WorkflowAction,
): WorkflowState {
  switch (action.type) {
    case "setLanguage":
      return { ...state, language: action.language };
    case "setPlanField":
      return {
        ...state,
        plan: { ...state.plan, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: "" },
      };
    case "setStep":
      return { ...state, step: action.step, errors: {} };
    case "setErrors":
      return { ...state, errors: action.errors };
    case "setAiStatus":
      return { ...state, aiStatus: action.status, aiError: action.error ?? null };
    case "applyExtraction": {
      const extractedTasks: WorkTask[] = action.extraction.tasks.map((task, index) => ({
        id: `extracted-task-${index + 1}`,
        nameEn: task.nameEn,
        nameAr: task.nameAr,
        durationMinutes: task.durationMinutes ?? 5,
        workload: task.workload ?? "light",
        environment: task.environment ?? "shaded_outdoor",
        splittable: task.splittable ?? false,
      }));
      return {
        ...state,
        step: "verify",
        aiStatus: "idle",
        aiError: null,
        plan: {
          ...state.plan,
          siteName: keepManual(state.plan.siteName, action.extraction.siteName),
          city: (state.plan.city || action.extraction.city || "") as PlanForm["city"],
          shiftDate: keepManual(state.plan.shiftDate, action.extraction.shiftDate),
          shiftStart: keepManual(state.plan.shiftStart, action.extraction.shiftStart),
          shiftEnd: keepManual(state.plan.shiftEnd, action.extraction.shiftEnd),
          crewSize: keepManual(state.plan.crewSize, action.extraction.crewSize),
          nonAcclimatizedWorkers: keepManual(
            state.plan.nonAcclimatizedWorkers,
            action.extraction.nonAcclimatizedWorkers,
          ),
        },
        tasks: extractedTasks,
        assumptions: action.extraction.assumptions,
        missingInformation: action.extraction.missingInformation,
      };
    }
    case "loadDemo":
      return {
        ...state,
        step: "verify",
        plan: {
          siteName: action.demo.shiftPlan.siteName,
          city: action.demo.shiftPlan.city,
          shiftDate: action.demo.shiftPlan.shiftDate,
          shiftStart: action.demo.shiftPlan.shiftStart,
          shiftEnd: action.demo.shiftPlan.shiftEnd,
          crewSize: String(action.demo.shiftPlan.crewSize),
          nonAcclimatizedWorkers: String(action.demo.shiftPlan.nonAcclimatizedWorkers),
          planText: "",
        },
        tasks: structuredClone(action.demo.shiftPlan.tasks),
        conditions: structuredClone(action.demo.siteConditions),
        forecast: structuredClone(action.demo.forecastHours),
        weatherStatus: "success",
        weatherError: null,
        isDemo: true,
        errors: {},
      };
    case "addTask": {
      const nextId = `manual-task-${state.tasks.length + 1}`;
      return {
        ...state,
        tasks: [
          ...state.tasks,
          {
            id: nextId,
            nameEn: "",
            nameAr: "",
            durationMinutes: 30,
            workload: "light",
            environment: "shaded_outdoor",
            splittable: false,
          },
        ],
      };
    }
    case "updateTask":
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.id ? { ...task, [action.field]: action.value } : task,
        ),
        errors: { ...state.errors, [`task-${action.id}-${action.field}`]: "" },
      };
    case "removeTask":
      return { ...state, tasks: state.tasks.filter((task) => task.id !== action.id) };
    case "setConditions":
      return { ...state, conditions: action.conditions, scheduleResult: null };
    case "weatherLoading":
      return { ...state, weatherStatus: "loading", weatherError: null, forecast: [] };
    case "weatherSuccess":
      return {
        ...state,
        weatherStatus: "success",
        weatherError: null,
        forecast: action.forecast,
      };
    case "weatherError":
      return {
        ...state,
        weatherStatus: "error",
        weatherError: action.error,
        forecast: [],
      };
    case "setScheduleResult":
      return { ...state, step: "results", scheduleResult: action.result };
    case "startOver":
      return { ...createInitialWorkflowState(), language: state.language };
  }
}

export function validatePlanDetails(plan: PlanForm): FormErrors {
  const errors: FormErrors = {};
  if (!plan.siteName.trim()) errors.siteName = "Site name is required.";
  if (!plan.city) errors.city = "Select a city.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.shiftDate)) errors.shiftDate = "Select a shift date.";
  if (!/^\d{2}:\d{2}$/.test(plan.shiftStart)) errors.shiftStart = "Enter a start time.";
  if (!/^\d{2}:\d{2}$/.test(plan.shiftEnd)) errors.shiftEnd = "Enter an end time.";
  if (plan.shiftStart && plan.shiftEnd && plan.shiftEnd <= plan.shiftStart) {
    errors.shiftEnd = "Shift end must be after shift start; overnight shifts are not supported.";
  }
  const crew = Number(plan.crewSize);
  const newWorkers = Number(plan.nonAcclimatizedWorkers);
  if (!Number.isInteger(crew) || crew <= 0) errors.crewSize = "Crew size must be a positive whole number.";
  if (!Number.isInteger(newWorkers) || newWorkers < 0) {
    errors.nonAcclimatizedWorkers = "New workers must be zero or a positive whole number.";
  } else if (Number.isInteger(crew) && newWorkers > crew) {
    errors.nonAcclimatizedWorkers = "New workers cannot exceed crew size.";
  }
  return errors;
}

export function validateVerifiedPlan(plan: PlanForm, tasks: WorkTask[]): FormErrors {
  const errors = validatePlanDetails(plan);
  if (tasks.length === 0) errors.tasks = "Add at least one task before continuing.";
  for (const task of tasks) {
    if (!task.nameEn.trim()) errors[`task-${task.id}-nameEn`] = "English name is required.";
    if (!task.nameAr.trim()) errors[`task-${task.id}-nameAr`] = "Arabic name is required.";
    if (!Number.isInteger(task.durationMinutes) || task.durationMinutes <= 0 || task.durationMinutes % 5 !== 0) {
      errors[`task-${task.id}-durationMinutes`] = "Duration must be a positive multiple of five minutes.";
    }
  }
  return errors;
}
