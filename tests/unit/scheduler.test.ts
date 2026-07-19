import { describe, expect, it } from "vitest";
import { generateSchedule } from "../../lib/domain/scheduler";
import { scheduleResultSchema } from "../../lib/domain/scheduler-types";
import type {
  ForecastHour,
  ShiftPlan,
  SiteConditions,
  WorkTask,
} from "../../lib/domain/types";
import { SAUDI_LOCATION_PRESETS } from "../../data/cities";

const defaultConditions: SiteConditions = {
  measurementMode: "onsite_twl",
  twlZone: "low",
};

function task(overrides: Partial<WorkTask> = {}): WorkTask {
  return {
    id: "task-1",
    nameEn: "Install barriers",
    nameAr: "تركيب الحواجز",
    durationMinutes: 60,
    workload: "heavy",
    environment: "direct_sun",
    splittable: true,
    ...overrides,
  };
}

function plan(overrides: Partial<ShiftPlan> = {}): ShiftPlan {
  return {
    siteName: "North works yard",
    location: SAUDI_LOCATION_PRESETS.riyadh,
    shiftDate: "2026-07-18",
    shiftStart: "11:30",
    shiftEnd: "15:30",
    crewSize: 6,
    nonAcclimatizedWorkers: 0,
    tasks: [task()],
    ...overrides,
  };
}

function overlaps(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
): boolean {
  return start < rangeEnd && end > rangeStart;
}

describe("deterministic scheduler", () => {
  it("never places seasonal direct-sun work inside 12:00–15:00", () => {
    const result = generateSchedule(plan(), defaultConditions, []);
    const directSunWork = result.blocks.filter(
      (block) => block.type === "work" && block.environment === "direct_sun",
    );

    expect(result.blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "restriction",
          start: "12:00",
          end: "15:00",
        }),
      ]),
    );
    expect(
      directSunWork.every(
        (block) => !overlaps(block.start, block.end, "12:00", "15:00"),
      ),
    ).toBe(true);
    expect(result.metrics.scheduledWorkMinutes).toBe(60);
    expect(result.metrics.restrictionMinutes).toBe(180);
    expect(result.unscheduled).toEqual([]);
  });

  it("allows indoor work and preferentially places it in the midday restriction", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "11:00",
        shiftEnd: "16:00",
        tasks: [
          task({ id: "sun", durationMinutes: 30 }),
          task({
            id: "indoor",
            nameEn: "Prepare equipment",
            nameAr: "تجهيز المعدات",
            durationMinutes: 60,
            workload: "light",
            environment: "conditioned_indoor",
          }),
        ],
      }),
      defaultConditions,
      [],
    );
    const indoorBlocks = result.blocks.filter(
      (block) => block.taskId === "indoor" && block.type === "work",
    );

    expect(indoorBlocks).toEqual([
      expect.objectContaining({ start: "12:00", end: "13:00" }),
    ]);
    expect(
      indoorBlocks.every((block) => overlaps(block.start, block.end, "12:00", "15:00")),
    ).toBe(true);
  });

  it("does not apply outdoor TWL recovery cycles to a cooled indoor area", () => {
    const result = generateSchedule(
      plan({ tasks:[task({id:"cooled",environment:"conditioned_indoor",workload:"heavy",durationMinutes:60})] }),
      { ...defaultConditions, twlZone:"high" },
      [],
    );
    expect(result.blocks.filter((block)=>block.taskId==="cooled"&&block.type==="rest")).toHaveLength(0);
    expect(result.blocks.find((block)=>block.taskId==="cooled"&&block.type==="work")).toMatchObject({taskId:"cooled"});
  });

  it("packages 60 minutes of high-TWL heavy work as 20/40 cycles without a final rest", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "09:00",
        tasks: [task({ durationMinutes: 60 })],
      }),
      { measurementMode: "onsite_twl", twlZone: "high" },
      [],
    );
    const taskBlocks = result.blocks.filter(
      (block) => block.taskId === "task-1",
    );

    expect(
      taskBlocks.map(({ type, start, end }) => ({ type, start, end })),
    ).toEqual([
      { type: "work", start: "06:00", end: "06:20" },
      { type: "rest", start: "06:20", end: "07:00" },
      { type: "work", start: "07:00", end: "07:20" },
      { type: "rest", start: "07:20", end: "08:00" },
      { type: "work", start: "08:00", end: "08:20" },
    ]);
    expect(result.metrics.restMinutes).toBe(80);
  });

  it("packages 90 minutes of intermediate-TWL heavy work as 45/15/45", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "08:00",
        tasks: [task({ durationMinutes: 90 })],
      }),
      { measurementMode: "onsite_twl", twlZone: "intermediate" },
      [],
    );

    expect(
      result.blocks
        .filter((block) => block.taskId === "task-1")
        .map(({ type, start, end }) => ({ type, start, end })),
    ).toEqual([
      { type: "work", start: "06:00", end: "06:45" },
      { type: "rest", start: "06:45", end: "07:00" },
      { type: "work", start: "07:00", end: "07:45" },
    ]);
  });

  it("packages 90 minutes of high-TWL light work as 45/15/45", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "08:00",
        tasks: [task({ durationMinutes: 90, workload: "light" })],
      }),
      { measurementMode: "onsite_twl", twlZone: "high" },
      [],
    );

    expect(
      result.blocks
        .filter((block) => block.taskId === "task-1")
        .map(({ type, start, end }) => ({ type, start, end })),
    ).toEqual([
      { type: "work", start: "06:00", end: "06:45" },
      { type: "rest", start: "06:45", end: "07:00" },
      { type: "work", start: "07:00", end: "07:45" },
    ]);
  });

  it("keeps a non-splittable task contiguous or leaves all of it unscheduled", () => {
    const fitting = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "08:00",
        tasks: [task({ durationMinutes: 90, splittable: false })],
      }),
      defaultConditions,
      [],
    );
    const notFitting = generateSchedule(
      plan({
        shiftStart: "11:00",
        shiftEnd: "16:00",
        tasks: [task({ durationMinutes: 90, splittable: false })],
      }),
      defaultConditions,
      [],
    );

    expect(
      fitting.blocks.filter((block) => block.taskId === "task-1"),
    ).toEqual([expect.objectContaining({ start: "06:00", end: "07:30" })]);
    expect(notFitting.blocks.some((block) => block.taskId === "task-1")).toBe(
      false,
    );
    expect(notFitting.unscheduled).toEqual([
      expect.objectContaining({ taskId: "task-1", unscheduledMinutes: 90 }),
    ]);
  });

  it("reports exact unscheduled minutes and a critical capacity conflict", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "07:00",
        tasks: [task({ durationMinutes: 100 })],
      }),
      defaultConditions,
      [],
    );

    expect(result.unscheduled).toEqual([
      {
        taskId: "task-1",
        taskName: "Install barriers",
        unscheduledMinutes: 40,
        reasonCode: "INSUFFICIENT_SAFE_CAPACITY",
      },
    ]);
    expect(result.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "critical",
          code: "INSUFFICIENT_SAFE_CAPACITY",
          taskId: "task-1",
        }),
      ]),
    );
    expect(result.metrics.unscheduledMinutes).toBe(40);
  });

  it("places direct-sun heavy work in cooler valid forecast hours", () => {
    const forecast: ForecastHour[] = [
      {
        time: "06:00",
        temperatureCelsius: 40,
        apparentTemperatureCelsius: 43,
        relativeHumidityPercent: 30,
        windSpeedKph: 8,
      },
      {
        time: "07:00",
        temperatureCelsius: 37,
        apparentTemperatureCelsius: 40,
        relativeHumidityPercent: 32,
        windSpeedKph: 8,
      },
      {
        time: "08:00",
        temperatureCelsius: 30,
        apparentTemperatureCelsius: 32,
        relativeHumidityPercent: 35,
        windSpeedKph: 9,
      },
      {
        time: "09:00",
        temperatureCelsius: 35,
        apparentTemperatureCelsius: 37,
        relativeHumidityPercent: 34,
        windSpeedKph: 9,
      },
    ];
    const result = generateSchedule(
      plan({ shiftStart: "06:00", shiftEnd: "10:00" }),
      defaultConditions,
      forecast,
    );

    expect(
      result.blocks.filter((block) => block.taskId === "task-1"),
    ).toEqual([
      expect.objectContaining({
        start: "08:00",
        end: "09:00",
        reasonCodes: expect.arrayContaining(["COOLER_FORECAST_SLOT"]),
      }),
    ]);
    expect(result.metrics.peakForecastTemperature).toBe(40);
  });

  it("returns a deeply equal result for identical input", () => {
    const shiftPlan = plan({ shiftStart: "06:00", shiftEnd: "10:00" });

    expect(generateSchedule(shiftPlan, defaultConditions, [])).toEqual(
      generateSchedule(shiftPlan, defaultConditions, []),
    );
  });

  it("marks a schedule without a supervisor-entered TWL zone as preliminary", () => {
    const result = generateSchedule(
      plan({ shiftStart: "06:00", shiftEnd: "08:00" }),
      { measurementMode: "forecast", twlZone: "none" },
      [],
    );

    expect(result.isPreliminary).toBe(true);
    expect(result.blocks.some((block) => block.type === "rest")).toBe(false);
    expect(result.metrics.hydrationPlanning.light.kind).toBe("preliminary");
    expect(result.blocks.every((block) => block.reasonCodes.length > 0)).toBe(
      true,
    );
  });

  it("respects original order when higher-priority objectives tie", () => {
    const tasks: WorkTask[] = [
      task({ id: "indoor-light", durationMinutes: 5, environment: "conditioned_indoor", workload: "light" }),
      task({ id: "shaded-light", durationMinutes: 5, environment: "shaded_outdoor", workload: "light" }),
      task({ id: "sun-light", durationMinutes: 5, environment: "direct_sun", workload: "light" }),
      task({ id: "indoor-heavy", durationMinutes: 5, environment: "conditioned_indoor", workload: "heavy" }),
      task({ id: "shaded-heavy", durationMinutes: 5, environment: "shaded_outdoor", workload: "heavy" }),
      task({ id: "sun-heavy", durationMinutes: 5, environment: "direct_sun", workload: "heavy" }),
    ];
    const result = generateSchedule(
      plan({ shiftStart: "10:00", shiftEnd: "10:30", tasks }),
      defaultConditions,
      [],
    );

    expect(
      result.blocks
        .filter((block) => block.type === "work")
        .map((block) => block.taskId),
    ).toEqual([
      "indoor-light",
      "shaded-light",
      "sun-light",
      "indoor-heavy",
      "shaded-heavy",
      "sun-heavy",
    ]);
  });

  it("keeps the required crew rest between separate outdoor tasks", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "08:00",
        tasks: [
          task({ id: "first", durationMinutes: 20 }),
          task({ id: "second", durationMinutes: 20 }),
        ],
      }),
      { measurementMode: "onsite_twl", twlZone: "high" },
      [],
    );

    expect(
      result.blocks
        .filter((block) => block.type !== "restriction")
        .map(({ type, taskId, start, end }) => ({ type, taskId, start, end })),
    ).toEqual([
      { type: "work", taskId: "first", start: "06:00", end: "06:20" },
      { type: "rest", taskId: "first", start: "06:20", end: "07:00" },
      { type: "work", taskId: "second", start: "07:00", end: "07:20" },
    ]);
  });

  it("does not add a midday restriction outside the season or without direct-sun work", () => {
    const outsideSeason = generateSchedule(
      plan({ shiftDate: "2026-06-14" }),
      defaultConditions,
      [],
    );
    const indoorOnly = generateSchedule(
      plan({
        tasks: [task({ environment: "conditioned_indoor" })],
      }),
      defaultConditions,
      [],
    );

    expect(outsideSeason.blocks.some((block) => block.type === "restriction")).toBe(
      false,
    );
    expect(indoorOnly.blocks.some((block) => block.type === "restriction")).toBe(
      false,
    );
  });

  it("keeps ordinary scheduling but marks 2027 regulatory guidance unavailable",()=>{
    const result=generateSchedule(plan({shiftDate:"2027-07-20",shiftStart:"12:00",shiftEnd:"13:00",tasks:[task({durationMinutes:60})]}),defaultConditions,[]);
    expect(result.blocks.some(block=>block.type==="restriction")).toBe(false);
    expect(result.metrics.scheduledWorkMinutes).toBe(60);
    expect(result).toMatchObject({regulatoryGuidanceAvailable:false,isPreliminary:true});
  });

  it("returns a valid result with non-overlapping crew work and rest blocks", () => {
    const shiftPlan = plan({
      shiftStart: "06:00",
      shiftEnd: "09:00",
      tasks: [task({ durationMinutes: 60 })],
    });
    const result = generateSchedule(
      shiftPlan,
      { measurementMode: "onsite_twl", twlZone: "high" },
      [],
    );
    const crewBlocks = result.blocks
      .filter((block) => block.type === "work" || block.type === "rest")
      .sort((left, right) => left.start.localeCompare(right.start));

    expect(scheduleResultSchema.parse(result)).toEqual(result);
    expect(
      crewBlocks.every(
        (block) =>
          block.start >= shiftPlan.shiftStart &&
          block.end <= shiftPlan.shiftEnd &&
          block.reasonCodes.length > 0,
      ),
    ).toBe(true);
    for (let index = 1; index < crewBlocks.length; index += 1) {
      expect(crewBlocks[index - 1].end <= crewBlocks[index].start).toBe(true);
    }
  });

  it("uses partial safe capacity for a splittable cycle task and reports the exact remainder", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "06:00",
        shiftEnd: "07:20",
        tasks: [task({ durationMinutes: 60 })],
      }),
      { measurementMode: "onsite_twl", twlZone: "high" },
      [],
    );

    expect(result.metrics.scheduledWorkMinutes).toBe(40);
    expect(result.metrics.restMinutes).toBe(40);
    expect(result.unscheduled).toEqual([
      expect.objectContaining({ taskId: "task-1", unscheduledMinutes: 20 }),
    ]);
  });

  it("schedules a splittable cyclic task across separate safe windows",()=>{
    const result=generateSchedule(plan({shiftStart:"11:00",shiftEnd:"16:00",tasks:[task({durationMinutes:40})]}),{measurementMode:"onsite_twl",twlZone:"high"},[]);
    expect(result.metrics.scheduledWorkMinutes).toBe(40);
    expect(result.unscheduled).toEqual([]);
    expect(result.conflicts.some(conflict=>conflict.code==="INSUFFICIENT_SAFE_CAPACITY")).toBe(false);
    expect(result.blocks.filter(block=>block.taskId==="task-1").map(({type,start,end})=>({type,start,end}))).toEqual([
      {type:"work",start:"11:00",end:"11:20"},
      {type:"rest",start:"11:20",end:"12:00"},
      {type:"work",start:"15:00",end:"15:20"},
    ]);
  });

  it("applies the indoor midday preference to non-splittable tasks", () => {
    const result = generateSchedule(
      plan({
        shiftStart: "11:00",
        shiftEnd: "16:00",
        tasks: [
          task({ id: "sun", durationMinutes: 30 }),
          task({
            id: "indoor",
            nameEn: "Indoor inspection",
            nameAr: "فحص داخلي",
            environment: "conditioned_indoor",
            workload: "light",
            durationMinutes: 60,
            splittable: false,
          }),
        ],
      }),
      defaultConditions,
      [],
    );

    expect(result.blocks.find((block) => block.taskId === "indoor")).toMatchObject({
      start: "12:00",
      end: "13:00",
    });
  });
});
