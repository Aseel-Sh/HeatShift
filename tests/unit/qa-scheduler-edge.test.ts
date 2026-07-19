import { describe, expect, it } from "vitest";
import { generateSchedule } from "../../lib/domain/scheduler";
import type { ShiftPlan, SiteConditions, WorkTask } from "../../lib/domain/types";
import { SAUDI_LOCATION_PRESETS } from "../../data/cities";

const task = (id: string, overrides: Partial<WorkTask> = {}): WorkTask => ({ id, nameEn:id, nameAr:`مهمة ${id}`, durationMinutes:20, workload:"heavy", environment:"direct_sun", splittable:true, ...overrides });
const plan = (overrides: Partial<ShiftPlan> = {}): ShiftPlan => ({ siteName:"QA",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:30",shiftEnd:"16:30",crewSize:4,nonAcclimatizedWorkers:0,tasks:[task("a")],...overrides });
const conditions = (twlZone: SiteConditions["twlZone"]): SiteConditions => ({ measurementMode:twlZone==="none"?"forecast":"onsite_twl",twlZone });

describe("scheduler adversarial edges", () => {
  it("handles exact noon and 15:00 boundaries without overlap", () => {
    const before = generateSchedule(plan({shiftStart:"11:55",shiftEnd:"12:00",tasks:[task("before",{durationMinutes:5,splittable:false})]}),conditions("low"),[]);
    expect(before.blocks.find(block=>block.type==="work")).toMatchObject({start:"11:55",end:"12:00"});
    const after = generateSchedule(plan({shiftStart:"15:00",shiftEnd:"15:05",tasks:[task("after",{durationMinutes:5,splittable:false})]}),conditions("low"),[]);
    expect(after.blocks.find(block=>block.type==="work")).toMatchObject({start:"15:00",end:"15:05"});
  });

  it("never lets a non-splittable task cross the midday restriction", () => {
    const result=generateSchedule(plan({shiftStart:"11:55",shiftEnd:"15:10",tasks:[task("contiguous",{durationMinutes:10,splittable:false})]}),conditions("low"),[]);
    const work=result.blocks.filter(block=>block.type==="work");
    expect(work).toHaveLength(1); expect(work[0]).toMatchObject({start:"15:00",end:"15:10"});
  });

  it("reports all work unscheduled when a direct-sun shift is entirely restricted", () => {
    const result=generateSchedule(plan({shiftStart:"12:00",shiftEnd:"15:00",tasks:[task("blocked",{durationMinutes:60})]}),conditions("high"),[]);
    expect(result.metrics.scheduledWorkMinutes).toBe(0); expect(result.metrics.restrictionMinutes).toBe(180); expect(result.metrics.unscheduledMinutes).toBe(60);
    expect(result.conflicts.some(conflict=>conflict.code==="INSUFFICIENT_SAFE_CAPACITY"&&conflict.severity==="critical")).toBe(true);
  });

  it("keeps multiple high-TWL heavy tasks and crew recovery mutually exclusive", () => {
    const result=generateSchedule(plan({shiftStart:"06:30",shiftEnd:"12:00",tasks:[task("a",{durationMinutes:40}),task("b",{durationMinutes:40})]}),conditions("high"),[]);
    const occupied=result.blocks.filter(block=>block.type!=="restriction").sort((a,b)=>a.start.localeCompare(b.start));
    expect(occupied.every((block,index)=>index===0||occupied[index-1].end<=block.start)).toBe(true);
    expect(result.blocks.some(block=>block.type==="rest")).toBe(true);
  });

  it("remains preliminary with no forecast and no TWL", () => {
    const result=generateSchedule(plan(),conditions("none"),[]);
    expect(result.isPreliminary).toBe(true); expect(result.metrics.peakForecastTemperature).toBeNull(); expect(result.metrics.restMinutes).toBe(0);
  });
});
