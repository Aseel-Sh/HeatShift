import { describe, expect, it } from "vitest";
import { getDemoScenario } from "../../lib/demo/get-demo-scenario";
import { generateSchedule } from "../../lib/domain/scheduler";
import { toWorkTasks } from "../../lib/workflow/draft-task";
import {
  createInitialWorkflowState,
  validatePlanDetails,
  validateVerifiedPlan,
  workflowReducer,
} from "../../lib/workflow/state";

describe("workflow state", () => {
  it("loads the deterministic demo without a network dependency", () => {
    const demo = getDemoScenario();
    const state = workflowReducer(createInitialWorkflowState(), {
      type: "loadDemo",
      demo,
    });

    expect(state.step).toBe("verify");
    expect(state.plan.siteName).toBe(demo.shiftPlan.siteName);
    expect(state.tasks).toEqual(demo.shiftPlan.tasks);
    expect(state.forecast).toEqual(demo.forecastHours);
    expect(state.isDemo).toBe(true);
  });

  it("updates and deletes tasks explicitly", () => {
    const loaded = workflowReducer(createInitialWorkflowState(), {
      type: "loadDemo",
      demo: getDemoScenario(),
    });
    const updated = workflowReducer(loaded, {
      type: "updateTask",
      id: "demo-trenching",
      field: "nameEn",
      value: "Edited trenching",
    });
    const removed = workflowReducer(updated, {
      type: "removeTask",
      id: "demo-trenching",
    });

    expect(updated.tasks[0].nameEn).toBe("Edited trenching");
    expect(removed.tasks).toHaveLength(getDemoScenario().shiftPlan.tasks.length - 1);
  });

  it("validates shift order and crew composition", () => {
    const initial = createInitialWorkflowState();
    expect(
      validatePlanDetails({
        ...initial.plan,
        siteName: "Site",
        city: "riyadh",
        shiftDate: "2026-07-20",
        shiftStart: "16:00",
        shiftEnd: "06:00",
        crewSize: "4",
        nonAcclimatizedWorkers: "5",
      }),
    ).toMatchObject({
      shiftEnd: expect.any(String),
      nonAcclimatizedWorkers: expect.any(String),
    });
  });

  it("requires tasks with valid five-minute durations", () => {
    const state = createInitialWorkflowState();
    expect(validateVerifiedPlan(state.plan, [])).toHaveProperty("tasks");
    expect(
      validateVerifiedPlan(state.plan, [
        {
          id: "task-1",
          nameEn: "Task",
          nameAr: "مهمة",
          durationMinutes: 7,
          workload: "light",
          environment: "conditioned_indoor",
          splittable: false,
        },
      ]),
    ).toHaveProperty("task-task-1-durationMinutes");
  });

  it("fills untouched plan fields and does not invent a missing extracted duration", () => {
    const state = workflowReducer(createInitialWorkflowState(), {
      type: "applyExtraction",
      extraction: {
        shiftStart: "07:00",
        shiftEnd: "15:00",
        tasks: [{ nameEn: "Unspecified task", nameAr: "مهمة غير محددة" }],
        assumptions: [],
        missingInformation: ["Task duration was not stated."],
      },
    });

    expect(state.plan.shiftStart).toBe("07:00");
    expect(state.plan.shiftEnd).toBe("15:00");
    expect(state.tasks[0].durationMinutes).toBeNull();
    expect(validateVerifiedPlan(state.plan, state.tasks)).toHaveProperty(
      "task-extracted-task-1-durationMinutes",
    );
  });

  it("preserves every unknown extracted safety field instead of defaulting it", () => {
    const state = workflowReducer(createInitialWorkflowState(), { type:"applyExtraction", extraction:{ tasks:[{nameEn:"Unknown",nameAr:"غير محدد"}], assumptions:[], missingInformation:[] } });
    expect(state.tasks[0]).toMatchObject({ durationMinutes:null, workload:"", environment:"", splittable:null });
    const errors=validateVerifiedPlan({...state.plan,siteName:"Site",city:"riyadh",shiftDate:"2026-07-20",shiftStart:"06:30",shiftEnd:"16:30",crewSize:"8",nonAcclimatizedWorkers:"0"},state.tasks);
    expect(errors).toMatchObject({[`task-${state.tasks[0].id}-workload`]:expect.any(String),[`task-${state.tasks[0].id}-environment`]:expect.any(String),[`task-${state.tasks[0].id}-splittable`]:expect.any(String)});
  });

  it("lets explicit manual zero win while populating an untouched blank new-worker count", () => {
    const initial=createInitialWorkflowState();
    const populated=workflowReducer(initial,{type:"applyExtraction",extraction:{nonAcclimatizedWorkers:2,tasks:[],assumptions:[],missingInformation:[]}});
    expect(populated.plan.nonAcclimatizedWorkers).toBe("2");
    const touched=workflowReducer(initial,{type:"setPlanField",field:"nonAcclimatizedWorkers",value:"0"});
    const preserved=workflowReducer(touched,{type:"applyExtraction",extraction:{nonAcclimatizedWorkers:2,tasks:[],assumptions:[],missingInformation:[]}});
    expect(preserved.plan.nonAcclimatizedWorkers).toBe("0");
  });

  it("invalidates sample-derived forecast, conditions, and result after material edits", () => {
    const loaded=workflowReducer(createInitialWorkflowState(),{type:"loadDemo",demo:getDemoScenario()});
    const edited=workflowReducer(loaded,{type:"setPlanField",field:"city",value:"jeddah"});
    expect(edited).toMatchObject({isDemo:false,planSource:"manual",forecast:[],forecastSource:"none",weatherMetadata:null,weatherStatus:"idle",weatherError:null,scheduleResult:null,conditions:{measurementMode:"forecast",twlZone:"none"}});
  });

  it("never reuses task IDs after deletion", () => {
    let state=createInitialWorkflowState();
    state=workflowReducer(state,{type:"addTask"});state=workflowReducer(state,{type:"addTask"});state=workflowReducer(state,{type:"addTask"});
    const middle=state.tasks[1].id;state=workflowReducer(state,{type:"removeTask",id:middle});state=workflowReducer(state,{type:"addTask"});
    expect(new Set(state.tasks.map(task=>task.id)).size).toBe(state.tasks.length);
    expect(state.tasks.at(-1)?.id).toBe("manual-task-4");
    const firstName=state.tasks[0].nameEn;const newest=state.tasks.at(-1)!;
    state=workflowReducer(state,{type:"updateTask",id:newest.id,field:"nameEn",value:"Newest"});
    expect(state.tasks[0].nameEn).toBe(firstName);expect(state.tasks.at(-1)?.nameEn).toBe("Newest");
    state={...state,tasks:state.tasks.map(task=>({...task,nameEn:task.nameEn||task.id,nameAr:task.nameAr||task.id,durationMinutes:5,workload:"light",environment:"shaded_outdoor",splittable:false}))};
    const result=generateSchedule({siteName:"Site",city:"riyadh",shiftDate:"2026-10-01",shiftStart:"06:30",shiftEnd:"07:00",crewSize:2,nonAcclimatizedWorkers:0,tasks:toWorkTasks(state.tasks)},{measurementMode:"forecast",twlZone:"none"},[]);
    expect(new Set(result.blocks.filter(block=>block.type==="work").map(block=>block.taskId))).toEqual(new Set(state.tasks.map(task=>task.id)));
  });
});
