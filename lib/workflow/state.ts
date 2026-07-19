import type { ExtractedPlan } from "../ai/plan-extraction-schema";
import type { DemoScenario } from "../../data/demo-scenario";
import type { ForecastHour, SaudiCity, SiteConditions } from "../domain/types";
import type { ScheduleResult } from "../domain/scheduler-types";
import { fromWorkTask, type DraftWorkTask } from "./draft-task";

export type Language = "en" | "ar";
export type WorkflowStep = "describe" | "verify" | "conditions" | "results";
export type PlanSource = "manual" | "ai" | "sample";
export type ForecastSource = "none" | "live" | "sample";
export interface WeatherMetadata { city: SaudiCity; date: string; retrievedAt: string }

export interface PlanForm {
  siteName: string; city: SaudiCity | ""; shiftDate: string; shiftStart: string; shiftEnd: string;
  crewSize: string; nonAcclimatizedWorkers: string; planText: string;
}
export type FormErrors = Record<string, string>;
export interface WorkflowState {
  language: Language; step: WorkflowStep; plan: PlanForm; touchedPlanFields: Partial<Record<keyof PlanForm, boolean>>;
  tasks: DraftWorkTask[]; nextTaskId: number; assumptions: string[]; missingInformation: string[];
  conditions: SiteConditions; forecast: ForecastHour[]; forecastSource: ForecastSource;
  weatherMetadata: WeatherMetadata | null;
  weatherStatus: "idle" | "loading" | "success" | "error"; weatherError: string | null;
  aiStatus: "idle" | "loading" | "error"; aiError: string | null; errors: FormErrors;
  aiModel: string | null;
  isDemo: boolean; planSource: PlanSource; scheduleResult: ScheduleResult | null;
}
export type WorkflowAction =
  | { type: "setLanguage"; language: Language }
  | { type: "setPlanField"; field: keyof PlanForm; value: string }
  | { type: "setStep"; step: WorkflowStep }
  | { type: "setErrors"; errors: FormErrors }
  | { type: "setAiStatus"; status: WorkflowState["aiStatus"]; error?: string }
  | { type: "applyExtraction"; extraction: ExtractedPlan; actualModel?: string | null }
  | { type: "loadDemo"; demo: DemoScenario }
  | { type: "addTask" }
  | { type: "updateTask"; id: string; field: keyof Omit<DraftWorkTask, "id">; value: DraftWorkTask[keyof Omit<DraftWorkTask, "id">] }
  | { type: "removeTask"; id: string }
  | { type: "setConditions"; conditions: SiteConditions }
  | { type: "weatherLoading" }
  | { type: "weatherSuccess"; forecast: ForecastHour[]; metadata: WeatherMetadata }
  | { type: "weatherError"; error: string }
  | { type: "setScheduleResult"; result: ScheduleResult }
  | { type: "startOver" };

export function createInitialWorkflowState(): WorkflowState {
  return { language:"en", step:"describe", plan:{siteName:"",city:"",shiftDate:"",shiftStart:"",shiftEnd:"",crewSize:"",nonAcclimatizedWorkers:"",planText:""}, touchedPlanFields:{}, tasks:[], nextTaskId:1, assumptions:[], missingInformation:[], conditions:{measurementMode:"forecast",twlZone:"none"}, forecast:[], forecastSource:"none", weatherMetadata:null, weatherStatus:"idle", weatherError:null, aiStatus:"idle", aiError:null, aiModel:null, errors:{}, isDemo:false, planSource:"manual", scheduleResult:null };
}

function extractedValue(state: WorkflowState, field: keyof PlanForm, value: string | number | undefined): string {
  if (state.touchedPlanFields[field]) return state.plan[field];
  return value === undefined ? state.plan[field] : String(value);
}
function invalidateSample(state: WorkflowState): Partial<WorkflowState> {
  if (!state.isDemo) return { scheduleResult: null };
  return { isDemo:false, planSource:"manual", forecast:[], forecastSource:"none", weatherMetadata:null, weatherStatus:"idle", weatherError:null, conditions:{measurementMode:"forecast",twlZone:"none"}, scheduleResult:null };
}

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case "setLanguage": return {...state,language:action.language};
    case "setPlanField": return {...state,...(action.field === "planText" ? {scheduleResult:null} : invalidateSample(state)),plan:{...state.plan,[action.field]:action.value},touchedPlanFields:{...state.touchedPlanFields,[action.field]:true},errors:{...state.errors,[action.field]:""}};
    case "setStep": return {...state,step:action.step,errors:{}};
    case "setErrors": return {...state,errors:action.errors};
    case "setAiStatus": return {...state,aiStatus:action.status,aiError:action.error??null};
    case "applyExtraction": {
      let next = state.nextTaskId;
      const tasks: DraftWorkTask[] = action.extraction.tasks.map((task) => ({ id:`extracted-task-${next++}`, nameEn:task.nameEn, nameAr:task.nameAr, durationMinutes:task.durationMinutes??null, workload:task.workload??"", environment:task.environment??"", splittable:task.splittable??null, requestedStart:task.requestedStart, requestedEnd:task.requestedEnd }));
      return {...state,...invalidateSample(state),step:"verify",aiStatus:"idle",aiError:null,aiModel:action.actualModel??null,planSource:"ai",nextTaskId:next,
        plan:{...state.plan,siteName:extractedValue(state,"siteName",action.extraction.siteName),city:extractedValue(state,"city",action.extraction.city) as PlanForm["city"],shiftDate:extractedValue(state,"shiftDate",action.extraction.shiftDate),shiftStart:extractedValue(state,"shiftStart",action.extraction.shiftStart),shiftEnd:extractedValue(state,"shiftEnd",action.extraction.shiftEnd),crewSize:extractedValue(state,"crewSize",action.extraction.crewSize),nonAcclimatizedWorkers:extractedValue(state,"nonAcclimatizedWorkers",action.extraction.nonAcclimatizedWorkers)},tasks,assumptions:action.extraction.assumptions,missingInformation:action.extraction.missingInformation};
    }
    case "loadDemo": return {...state,step:"verify",plan:{siteName:action.demo.shiftPlan.siteName,city:action.demo.shiftPlan.city,shiftDate:action.demo.shiftPlan.shiftDate,shiftStart:action.demo.shiftPlan.shiftStart,shiftEnd:action.demo.shiftPlan.shiftEnd,crewSize:String(action.demo.shiftPlan.crewSize),nonAcclimatizedWorkers:String(action.demo.shiftPlan.nonAcclimatizedWorkers),planText:""},touchedPlanFields:{},tasks:action.demo.shiftPlan.tasks.map(fromWorkTask),conditions:structuredClone(action.demo.siteConditions),forecast:structuredClone(action.demo.forecastHours),forecastSource:"sample",weatherMetadata:structuredClone(action.demo.weatherMetadata),weatherStatus:"success",weatherError:null,isDemo:true,planSource:"sample",errors:{},scheduleResult:null};
    case "addTask": { const task:DraftWorkTask={id:`manual-task-${state.nextTaskId}`,nameEn:"",nameAr:"",durationMinutes:null,workload:"",environment:"",splittable:null}; return {...state,...invalidateSample(state),tasks:[...state.tasks,task],nextTaskId:state.nextTaskId+1}; }
    case "updateTask": return {...state,...invalidateSample(state),tasks:state.tasks.map(task=>task.id===action.id?{...task,[action.field]:action.value}:task),errors:{...state.errors,[`task-${action.id}-${action.field}`]:""}};
    case "removeTask": return {...state,...invalidateSample(state),tasks:state.tasks.filter(task=>task.id!==action.id)};
    case "setConditions": return {...state,...(state.isDemo?{isDemo:false,planSource:"manual",forecast:[],forecastSource:"none",weatherMetadata:null,weatherStatus:"idle",weatherError:null}:{}),conditions:action.conditions,scheduleResult:null};
    case "weatherLoading": return {...state,weatherStatus:"loading",weatherError:null,forecast:[],forecastSource:"none",weatherMetadata:null};
    case "weatherSuccess": return {...state,weatherStatus:"success",weatherError:null,forecast:action.forecast,forecastSource:"live",weatherMetadata:action.metadata};
    case "weatherError": return {...state,weatherStatus:"error",weatherError:action.error,forecast:[],forecastSource:"none",weatherMetadata:null};
    case "setScheduleResult": return {...state,step:"results",scheduleResult:action.result};
    case "startOver": return {...createInitialWorkflowState(),language:state.language};
  }
}

export function validatePlanDetails(plan: PlanForm): FormErrors {
  const errors:FormErrors={}; if(!plan.siteName.trim())errors.siteName="Site name is required.";if(!plan.city)errors.city="Select a city.";if(!/^\d{4}-\d{2}-\d{2}$/.test(plan.shiftDate))errors.shiftDate="Select a shift date.";if(!/^\d{2}:\d{2}$/.test(plan.shiftStart))errors.shiftStart="Enter a start time.";if(!/^\d{2}:\d{2}$/.test(plan.shiftEnd))errors.shiftEnd="Enter an end time.";if(plan.shiftStart&&plan.shiftEnd&&plan.shiftEnd<=plan.shiftStart)errors.shiftEnd="Shift end must be after shift start; overnight shifts are not supported.";
  const crew=Number(plan.crewSize),newWorkers=Number(plan.nonAcclimatizedWorkers);if(plan.crewSize.trim()===""||!Number.isInteger(crew)||crew<=0)errors.crewSize="Crew size must be a positive whole number.";if(plan.nonAcclimatizedWorkers.trim()===""||!Number.isInteger(newWorkers)||newWorkers<0)errors.nonAcclimatizedWorkers="New workers must be zero or a positive whole number.";else if(Number.isInteger(crew)&&newWorkers>crew)errors.nonAcclimatizedWorkers="New workers cannot exceed crew size.";return errors;
}
export function validateVerifiedPlan(plan: PlanForm,tasks:DraftWorkTask[]):FormErrors { const errors=validatePlanDetails(plan);if(!tasks.length)errors.tasks="Add at least one task before continuing.";for(const task of tasks){if(!task.nameEn.trim())errors[`task-${task.id}-nameEn`]="English name is required.";if(!task.nameAr.trim())errors[`task-${task.id}-nameAr`]="Arabic name is required.";if(task.durationMinutes===null||!Number.isInteger(task.durationMinutes)||task.durationMinutes<=0||task.durationMinutes%5!==0)errors[`task-${task.id}-durationMinutes`]="Duration must be a positive multiple of five minutes.";if(!task.workload)errors[`task-${task.id}-workload`]="Select a workload.";if(!task.environment)errors[`task-${task.id}-environment`]="Select an environment.";if(task.splittable===null)errors[`task-${task.id}-splittable`]="Select whether the task may be split.";if((task.requestedStart&&!task.requestedEnd)||(!task.requestedStart&&task.requestedEnd))errors[`task-${task.id}-requestedTime`]="Enter both requested times or leave both blank.";}return errors; }
