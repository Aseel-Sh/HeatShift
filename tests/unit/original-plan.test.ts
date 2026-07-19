import { describe, expect, it } from "vitest";
import { evaluateOriginalPlan } from "../../lib/domain/original-plan";
import type { ShiftPlan, SiteConditions, WorkTask } from "../../lib/domain/types";

const task=(id:string,overrides:Partial<WorkTask>={}):WorkTask=>({id,nameEn:id,nameAr:id,durationMinutes:60,workload:"heavy",environment:"direct_sun",splittable:true,...overrides});
const plan=(tasks:WorkTask[],overrides:Partial<ShiftPlan>={}):ShiftPlan=>({siteName:"Site",city:"riyadh",shiftDate:"2026-07-20",shiftStart:"06:30",shiftEnd:"16:30",crewSize:8,nonAcclimatizedWorkers:0,tasks,...overrides});
const high:SiteConditions={measurementMode:"onsite_twl",twlZone:"high"};

describe("original requested plan evaluation",()=>{
  it("keeps original findings separate and detects restriction, overlap, short intervals, outside work, and missing times",()=>{
    const findings=evaluateOriginalPlan(plan([
      task("midday",{requestedStart:"11:30",requestedEnd:"12:15"}),
      task("overlap",{requestedStart:"11:45",requestedEnd:"12:45"}),
      task("outside",{requestedStart:"06:00",requestedEnd:"06:30"}),
      task("missing",{environment:"shaded_outdoor"}),
    ]),high);
    const codes=findings.map(item=>item.code);
    expect(codes).toEqual(expect.arrayContaining(["ORIGINAL_MIDDAY_DIRECT_SUN","ORIGINAL_TASK_OVERLAP","ORIGINAL_INTERVAL_TOO_SHORT","ORIGINAL_TASK_OUTSIDE_SHIFT","ORIGINAL_TIME_MISSING","ORIGINAL_TWL_CYCLE_INCOMPATIBLE"]));
    expect(codes).not.toContain("INSUFFICIENT_SAFE_CAPACITY");
  });
  it("detects total requested duration exceeding the shift",()=>{
    expect(evaluateOriginalPlan(plan([task("a",{durationMinutes:400}),task("b",{durationMinutes:400})]),{measurementMode:"forecast",twlZone:"none"}).some(item=>item.code==="ORIGINAL_WORK_EXCEEDS_SHIFT")).toBe(true);
  });
  it("does not apply TWL cycle incompatibility to a cooled indoor area",()=>{
    const findings=evaluateOriginalPlan(plan([task("cooled",{environment:"conditioned_indoor",requestedStart:"12:00",requestedEnd:"13:00"})]),high);
    expect(findings.some(item=>item.code==="ORIGINAL_TWL_CYCLE_INCOMPATIBLE")).toBe(false);
  });
});
