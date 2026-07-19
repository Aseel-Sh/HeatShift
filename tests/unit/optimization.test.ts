import { describe,expect,it } from "vitest";
import { SAUDI_LOCATION_PRESETS } from "../../data/cities";
import { shiftPlanSchema } from "../../lib/domain/types";
import { toScheduleActivities } from "../../lib/workflow/draft-task";
import { compareScheduleCandidates,generateSchedule,generateScheduleCandidates,validateChronologicalRecovery,validateScheduleHardConstraints } from "../../lib/domain/scheduler";
import { REGRESSION_SHIFT_PLAN,REGRESSION_SITE_CONDITIONS } from "../../data/regression-plan";

describe("deterministic bounded schedule optimization",()=>{
  it("accepts a fixed break without work-only fields",()=>{
    const parsed=shiftPlanSchema.safeParse({
      siteName:"Operations test",
      location:SAUDI_LOCATION_PRESETS.riyadh,
      shiftDate:"2026-07-20",
      shiftStart:"06:00",
      shiftEnd:"10:00",
      crewSize:4,
      nonAcclimatizedWorkers:0,
      tasks:[{
        id:"break-1",nameEn:"Tool break",nameAr:"استراحة الأدوات",
        activityKind:"break",durationMinutes:15,timingPreference:"fixed",
        requestedStart:"08:00",requestedEnd:"08:15",recoveryEligibility:"not_eligible",
      }],
    });

    expect(parsed.success).toBe(true);
  });

  it("preserves verified breaks and meals at the scheduler boundary",()=>{
    const activities=toScheduleActivities([{
      id:"meal-1",nameEn:"Lunch",nameAr:"غداء",activityKind:"meal",
      durationMinutes:30,workload:"",environment:"",splittable:null,
      recoveryEligibility:"eligible",timingPreference:"preferred",
      requestedStart:"12:00",requestedEnd:"12:30",
    }]);

    expect(activities).toEqual([expect.objectContaining({
      id:"meal-1",activityKind:"meal",recoveryEligibility:"eligible",
      requestedStart:"12:00",requestedEnd:"12:30",
    })]);
  });

  it("keeps a feasible fixed break at its requested time",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Operations test",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"10:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[{
      id:"break-1",nameEn:"Tool break",nameAr:"استراحة الأدوات",activityKind:"break",
      durationMinutes:15,timingPreference:"fixed",requestedStart:"08:00",requestedEnd:"08:15",
      recoveryEligibility:"not_eligible",
    }]});
    const result=generateSchedule(plan,{measurementMode:"onsite_twl",twlZone:"high"},[]);

    expect(result.blocks).toContainEqual(expect.objectContaining({
      taskId:"break-1",type:"break",start:"08:00",end:"08:15",
    }));
    expect(result.unscheduled).toEqual([]);
  });

  it("selects from six deterministic candidate strategies without claiming global optimality",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Candidates",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"07:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"optional",nameEn:"Optional cleanup",nameAr:"تنظيف اختياري",durationMinutes:60,workload:"light",environment:"conditioned_indoor",splittable:true},
      {id:"required",nameEn:"Required inspection",nameAr:"فحص مطلوب",durationMinutes:60,workload:"light",environment:"conditioned_indoor",splittable:true,mustSchedule:true},
    ]});
    const result=generateSchedule(plan,{measurementMode:"forecast",twlZone:"none"},[]);

    expect(result.optimizationSummary).toMatchObject({
      candidatesEvaluated:6,hardConstraintViolations:0,unscheduledMustScheduleMinutes:0,
    });
    expect(result.unscheduled).toContainEqual(expect.objectContaining({taskId:"optional",unscheduledMinutes:60}));
    expect(result.unscheduled.some(item=>item.taskId==="required")).toBe(false);
    expect(result.explanationSummary).toContain("Selected from 6 deterministic candidate schedules.");
    expect(result.explanationSummary.toLowerCase()).not.toContain("optimal");
  });

  it("detects continuous outdoor exposure across task boundaries in chronological order",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Global recovery",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"07:00",shiftEnd:"09:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"a",nameEn:"Task A",nameAr:"المهمة أ",durationMinutes:20,workload:"heavy",environment:"direct_sun",splittable:true},
      {id:"b",nameEn:"Task B",nameAr:"المهمة ب",durationMinutes:20,workload:"heavy",environment:"direct_sun",splittable:true},
    ]});
    const violations=validateChronologicalRecovery(plan,{measurementMode:"onsite_twl",twlZone:"high"},[
      {id:"b-work",taskId:"b",type:"work",start:"07:40",end:"08:00",labelEn:"Task B",labelAr:"المهمة ب",workload:"heavy",environment:"direct_sun",reasonCodes:["TEST"]},
      {id:"a-work",taskId:"a",type:"work",start:"08:00",end:"08:20",labelEn:"Task A",labelAr:"المهمة أ",workload:"heavy",environment:"direct_sun",reasonCodes:["TEST"]},
    ]);

    expect(violations).toContain("OUTDOOR_RECOVERY_REQUIRED");
  });

  it("uses an explicitly eligible meal as recovery without double-counting separate rest",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Meal recovery",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"08:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"heavy",nameEn:"Heavy work",nameAr:"عمل ثقيل",durationMinutes:40,workload:"heavy",environment:"direct_sun",splittable:true},
      {id:"meal",nameEn:"Breakfast",nameAr:"إفطار",activityKind:"meal",durationMinutes:40,timingPreference:"fixed",requestedStart:"06:20",requestedEnd:"07:00",recoveryEligibility:"eligible"},
    ]});
    const result=generateSchedule(plan,{measurementMode:"onsite_twl",twlZone:"high"},[]);

    expect(result.blocks.filter(block=>block.taskId==="heavy").map(block=>[block.type,block.start,block.end])).toEqual([
      ["work","06:00","06:20"],["work","07:00","07:20"],
    ]);
    expect(result.blocks.find(block=>block.taskId==="meal")?.reasonCodes).toContain("TWL_RECOVERY_CREDIT");
    expect(result.blocks.filter(block=>block.type==="rest")).toHaveLength(0);
  });

  it("does not treat an ineligible lunch as required recovery",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Lunch recovery",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"08:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"heavy",nameEn:"Heavy work",nameAr:"عمل ثقيل",durationMinutes:40,workload:"heavy",environment:"direct_sun",splittable:true},
      {id:"lunch",nameEn:"Lunch",nameAr:"غداء",activityKind:"meal",durationMinutes:40,timingPreference:"fixed",requestedStart:"06:20",requestedEnd:"07:00",recoveryEligibility:"not_eligible"},
    ]});
    const violations=validateChronologicalRecovery(plan,{measurementMode:"onsite_twl",twlZone:"high"},[
      {id:"w1",taskId:"heavy",type:"work",start:"06:00",end:"06:20",labelEn:"Heavy work",labelAr:"عمل ثقيل",workload:"heavy",environment:"direct_sun",reasonCodes:["TEST"]},
      {id:"l",taskId:"lunch",type:"meal",start:"06:20",end:"07:00",labelEn:"Lunch",labelAr:"غداء",reasonCodes:["TEST"]},
      {id:"w2",taskId:"heavy",type:"work",start:"07:00",end:"07:20",labelEn:"Heavy work",labelAr:"عمل ثقيل",workload:"heavy",environment:"direct_sun",reasonCodes:["TEST"]},
    ]);
    expect(violations).toContain("OUTDOOR_RECOVERY_REQUIRED");
  });

  it("reports a fixed activity that cannot remain fixed as explicit infeasibility",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Fixed infeasibility",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"07:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"fixed-break",nameEn:"Fixed break",nameAr:"استراحة ثابتة",activityKind:"break",durationMinutes:30,timingPreference:"fixed",requestedStart:"07:00",requestedEnd:"07:30",recoveryEligibility:"not_eligible"},
    ]});
    const result=generateSchedule(plan,{measurementMode:"forecast",twlZone:"none"},[]);
    expect(result.blocks.some(block=>block.taskId==="fixed-break")).toBe(false);
    expect(result.unscheduled).toContainEqual(expect.objectContaining({taskId:"fixed-break",unscheduledMinutes:30,reasonCode:"FIXED_ACTIVITY_INFEASIBLE"}));
    expect(result.conflicts).toContainEqual(expect.objectContaining({code:"FIXED_ACTIVITY_INFEASIBLE",taskId:"fixed-break",severity:"critical"}));
    expect(result.optimizationSummary.hardConstraintViolations).toBe(0);
  });

  it("moves a preferred break when its requested time is occupied by a fixed meal",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Preferred movement",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"08:00",shiftEnd:"10:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"meal",nameEn:"Fixed meal",nameAr:"وجبة ثابتة",activityKind:"meal",durationMinutes:30,timingPreference:"fixed",requestedStart:"09:00",requestedEnd:"09:30",recoveryEligibility:"not_eligible"},
      {id:"break",nameEn:"Preferred break",nameAr:"استراحة مفضلة",activityKind:"break",durationMinutes:15,timingPreference:"preferred",requestedStart:"09:00",requestedEnd:"09:15",recoveryEligibility:"not_eligible"},
    ]});
    const result=generateSchedule(plan,{measurementMode:"forecast",twlZone:"none"},[]);
    const moved=result.blocks.find(block=>block.taskId==="break");
    expect(moved).toBeDefined();
    expect(moved?.start).not.toBe("09:00");
    expect(result.optimizationSummary.movementMinutes).toBeGreaterThan(0);
  });

  it("respects confirmed predecessor dependencies",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Dependencies",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-10-20",shiftStart:"06:00",shiftEnd:"08:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"install",nameEn:"Install",nameAr:"تركيب",durationMinutes:30,workload:"light",environment:"conditioned_indoor",splittable:false,predecessorTaskIds:["prepare"]},
      {id:"prepare",nameEn:"Prepare",nameAr:"تجهيز",durationMinutes:30,workload:"light",environment:"conditioned_indoor",splittable:false},
    ]});
    const result=generateSchedule(plan,{measurementMode:"forecast",twlZone:"none"},[]);
    const prepare=result.blocks.find(block=>block.taskId==="prepare"&&block.type==="work")!;
    const install=result.blocks.find(block=>block.taskId==="install"&&block.type==="work")!;
    expect(prepare.end<=install.start).toBe(true);
    expect(result.optimizationSummary.hardConstraintViolations).toBe(0);
  });

  it("keeps feasible fixed work at the confirmed interval",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Fixed work",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-10-20",shiftStart:"06:00",shiftEnd:"10:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"fixed-work",nameEn:"Fixed inspection",nameAr:"فحص ثابت",durationMinutes:30,workload:"light",environment:"direct_sun",splittable:false,timingPreference:"fixed",requestedStart:"08:00",requestedEnd:"08:30"},
    ]});
    const result=generateSchedule(plan,{measurementMode:"onsite_twl",twlZone:"low"},[]);
    expect(result.blocks.find(block=>block.taskId==="fixed-work"&&block.type==="work")).toMatchObject({start:"08:00",end:"08:30"});
    expect(result.optimizationSummary.hardConstraintViolations).toBe(0);
  });

  it("preserves chronological recovery after fixed outdoor work",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Fixed recovery",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-10-20",shiftStart:"06:00",shiftEnd:"08:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"fixed",nameEn:"Fixed heavy work",nameAr:"عمل ثقيل ثابت",durationMinutes:20,workload:"heavy",environment:"direct_sun",splittable:false,timingPreference:"fixed",requestedStart:"06:00",requestedEnd:"06:20"},
      {id:"later",nameEn:"Later heavy work",nameAr:"عمل ثقيل لاحق",durationMinutes:20,workload:"heavy",environment:"direct_sun",splittable:true},
    ]});
    const conditions={measurementMode:"onsite_twl" as const,twlZone:"high" as const};
    const result=generateSchedule(plan,conditions,[]);
    expect(result.blocks).toContainEqual(expect.objectContaining({type:"rest",start:"06:20",end:"07:00"}));
    expect(validateScheduleHardConstraints(plan,conditions,result)).toEqual([]);
    expect(result.optimizationSummary.hardConstraintViolations).toBe(0);
  });

  it("evaluates candidate strategies that produce different schedules",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Candidate diversity",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-10-20",shiftStart:"06:00",shiftEnd:"07:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"optional",nameEn:"Optional",nameAr:"اختياري",durationMinutes:60,workload:"light",environment:"conditioned_indoor",splittable:true},
      {id:"required",nameEn:"Required",nameAr:"مطلوب",durationMinutes:60,workload:"light",environment:"conditioned_indoor",splittable:true,mustSchedule:true},
    ]});
    const candidates=generateScheduleCandidates(plan,{measurementMode:"forecast",twlZone:"none"},[]);
    const scheduledSequences=new Set(candidates.map(candidate=>candidate.result.blocks.filter(block=>block.type==="work").map(block=>block.taskId).join(",")));
    expect(candidates).toHaveLength(6);
    expect(scheduledSequences.size).toBeGreaterThan(1);
  });

  it("selects a score no worse than every evaluated candidate and remains deterministic",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Candidate scoring",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"09:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"cleanup",nameEn:"Cleanup",nameAr:"تنظيف",durationMinutes:60,workload:"light",environment:"conditioned_indoor",splittable:true},
      {id:"critical",nameEn:"Critical pour",nameAr:"صب حرج",durationMinutes:40,workload:"heavy",environment:"direct_sun",splittable:true,mustSchedule:true},
    ]});
    const conditions={measurementMode:"onsite_twl" as const,twlZone:"high" as const};
    const candidates=generateScheduleCandidates(plan,conditions,[]);
    const selected=generateSchedule(plan,conditions,[]);
    const selectedCandidate=candidates.find(candidate=>candidate.strategy===selected.optimizationSummary.selectedStrategy)!;
    expect(candidates.every(candidate=>compareScheduleCandidates(selectedCandidate,candidate)<=0)).toBe(true);
    expect(selected).toEqual(generateSchedule(plan,conditions,[]));
    expect(validateScheduleHardConstraints(plan,conditions,selected)).toEqual([]);
    expect(selected.optimizationSummary.hardConstraintViolations).toBe(0);
  });

  it("prioritizes the confirmed must-complete concrete pour in the exact regression plan",()=>{
    const result=generateSchedule(REGRESSION_SHIFT_PLAN,REGRESSION_SITE_CONDITIONS,[]);
    const candidates=generateScheduleCandidates(REGRESSION_SHIFT_PLAN,REGRESSION_SITE_CONDITIONS,[]);
    const concrete=result.unscheduled.find(item=>item.taskId==="concrete")?.unscheduledMinutes??0;
    const cleanup=result.unscheduled.find(item=>item.taskId==="cleanup")?.unscheduledMinutes??0;
    expect(concrete).toBe(0);
    expect(cleanup).toBeGreaterThan(0);
    expect(result.optimizationSummary).toEqual({candidatesEvaluated:6,selectedStrategy:"critical_must_schedule_first",hardConstraintViolations:0,unscheduledMustScheduleMinutes:0,unscheduledOtherMinutes:355,movementMinutes:535,splitCount:9,orderInversions:4,heatExposurePenalty:0});
    expect(candidates.filter(candidate=>candidate.strategy!=="critical_must_schedule_first").some(candidate=>candidate.optimizationSummary.unscheduledMustScheduleMinutes>0)).toBe(true);
    expect(validateScheduleHardConstraints(REGRESSION_SHIFT_PLAN,REGRESSION_SITE_CONDITIONS,result)).toEqual([]);
    expect(REGRESSION_SHIFT_PLAN.tasks.find(task=>task.id==="concrete")?.operationalNotes).toEqual(["Pump booked only today."]);
    expect(result.explanationSummary).toContain("Pump booked only today.");
    expect(result.explanationSummary).toContain("does not create a clock window");
  });

  it("reports unavoidable must-schedule infeasibility honestly",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Unavoidable",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-10-20",shiftStart:"06:00",shiftEnd:"06:20",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"must",nameEn:"Must finish",nameAr:"يجب إكماله",durationMinutes:40,workload:"heavy",environment:"direct_sun",splittable:true,mustSchedule:true},
    ]});
    const result=generateSchedule(plan,{measurementMode:"onsite_twl",twlZone:"high"},[]);
    expect(result.optimizationSummary.unscheduledMustScheduleMinutes).toBe(20);
    expect(result.unscheduled).toContainEqual(expect.objectContaining({taskId:"must",unscheduledMinutes:20}));
    expect(result.explanationSummary).toContain("must-schedule work could not fit");
    expect(result.optimizationSummary.hardConstraintViolations).toBe(0);
  });

  it("keeps global recovery valid when forecast ranking reverses task order",()=>{
    const plan=shiftPlanSchema.parse({siteName:"Forecast reversal",location:SAUDI_LOCATION_PRESETS.riyadh,shiftDate:"2026-10-20",shiftStart:"06:00",shiftEnd:"09:00",crewSize:4,nonAcclimatizedWorkers:0,tasks:[
      {id:"a",nameEn:"Task A",nameAr:"المهمة أ",durationMinutes:20,workload:"heavy",environment:"direct_sun",splittable:true},
      {id:"b",nameEn:"Task B",nameAr:"المهمة ب",durationMinutes:20,workload:"heavy",environment:"direct_sun",splittable:true},
    ]});
    const forecast=[
      {time:"06:00",temperatureCelsius:30,apparentTemperatureCelsius:31,relativeHumidityPercent:20,windSpeedKph:5},
      {time:"07:00",temperatureCelsius:20,apparentTemperatureCelsius:21,relativeHumidityPercent:20,windSpeedKph:5},
      {time:"08:00",temperatureCelsius:40,apparentTemperatureCelsius:41,relativeHumidityPercent:20,windSpeedKph:5},
    ];
    const conditions={measurementMode:"onsite_twl" as const,twlZone:"high" as const};
    const result=generateSchedule(plan,conditions,forecast);
    const work=result.blocks.filter(block=>block.type==="work");
    expect(work.map(block=>block.taskId)).toEqual(["b","a"]);
    expect(validateChronologicalRecovery(plan,conditions,result.blocks)).toEqual([]);
    expect(result.optimizationSummary.hardConstraintViolations).toBe(0);
  });
});
