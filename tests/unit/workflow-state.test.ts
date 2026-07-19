import { describe, expect, it } from "vitest";
import { getDemoScenario } from "../../lib/demo/get-demo-scenario";
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
          environment: "indoor",
          splittable: false,
        },
      ]),
    ).toHaveProperty("task-task-1-durationMinutes");
  });
});
