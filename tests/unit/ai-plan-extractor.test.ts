import { describe, expect, it, vi } from "vitest";
import {
  extractPlan,
  type ChatCompletionsClient,
} from "../../lib/ai/plan-extractor";

const validPlan = {
  siteName: "Riyadh north yard",
  city: "riyadh",
  shiftDate: "2026-07-20",
  shiftStart: "06:30",
  shiftEnd: "16:30",
  crewSize: 8,
  nonAcclimatizedWorkers: 2,
  tasks: [{ nameEn: "Trenching", nameAr: "حفر الخندق", durationMinutes: 120, workload: "heavy", environment: "direct_sun", splittable: true, requestedStart:"11:30", requestedEnd:"13:30" }],
  assumptions: ["Trenching was interpreted as heavy work."],
  missingInformation: [],
};

describe("AI plan extraction", () => {
  it("combines authoritative form context with the exact deterministic schedule import", async () => {
    const text = `Crew A - Riyadh
Start 6:00 AM

6:00-6:30 Toolbox talk + prep
6:30-9:00 Excavation
9:00-9:15 Break
9:15-11:30 Rebar + forms
11:30-12:00 Lunch
12:00-2:30 Concrete pour
2:30-3:00 Finish + curing
3:00-4:00 Cleanup

Need concrete completed today. Pump booked only today.`;
    const complete = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        siteName: "Invented site",
        city: "riyadh",
        crewSize: 5,
        tasks: [],
        assumptions: [],
        missingInformation: ["Crew size not stated", "Shift end not stated", "Task classifications need review"],
      }),
      model: "free-model",
    });
    const result = await extractPlan(text, {
      apiKey: "key",
      model: "openrouter/free",
      client: { complete },
      context: {
        siteName: "North utility site",
        locationName: "Riyadh",
        shiftDate: "2026-07-20",
        shiftStart: "06:00",
        shiftEnd: "16:30",
        crewSize: 8,
        nonAcclimatizedWorkers: 2,
      },
    });

    expect(result.plan).toMatchObject({
      siteName: "North utility site",
      city: "riyadh",
      shiftDate: "2026-07-20",
      shiftStart: "06:00",
      shiftEnd: "16:30",
      crewSize: 8,
      nonAcclimatizedWorkers: 2,
    });
    expect(result.plan.missingInformation).toEqual(["Task classifications need review"]);
    expect(result.plan.tasks).toHaveLength(8);
    expect(result.plan.tasks.map((task) => task.durationMinutes)).toEqual([30, 150, 15, 135, 30, 150, 30, 60]);
    expect(result.plan.tasks[2]).toMatchObject({ activityKind: "break", recoveryEligibility: "unknown" });
    expect(result.plan.tasks[4]).toMatchObject({ activityKind: "meal", recoveryEligibility: "unknown" });
    expect(result.plan.tasks[5]).toMatchObject({ mustSchedule: true, operationalNotes: ["Pump booked only today."] });
    expect(result.plan.tasks.every((task) => task.workload === undefined && task.environment === undefined)).toBe(true);
  });

  it("uses an OpenAI-compatible provider and validates structured output", async () => {
    const complete = vi.fn().mockResolvedValue({ content: JSON.stringify(validPlan), model:"google/gemma-free" });
    const result = await extractPlan("Riyadh north yard site: eight workers, two new, work 2026-07-20 from 06:30 to 16:30. Heavy direct-sun trenching from 11:30 to 13:30 takes 120 minutes and may be split.", {
      apiKey: "test-key", model: "openrouter/free", client: { complete },
    });

    expect(result.plan.city).toBe("riyadh");
    expect(result.plan.tasks[0]).toMatchObject({ requestedStart:"11:30", requestedEnd:"13:30" });
    expect(result.metadata.actualModel).toBe("google/gemma-free");
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({
      model: "openrouter/free",
      responseFormat: expect.objectContaining({ type: "json_schema" }),
    }));
  });

  it("removes model facts that have no evidence in the source text", async () => {
    const invented = { ...validPlan, shiftDate:"2025-08-27", crewSize:5, tasks:validPlan.tasks.map(task=>({...task,durationMinutes:45,requestedStart:"09:00",requestedEnd:"09:45"})) };
    const complete = vi.fn().mockResolvedValue({ content: JSON.stringify(invented), model:"free-router-model" });
    const result = await extractPlan("Riyadh crew working tomorrow. Trenching is planned, but duration and shift times are not known.", { apiKey:"key", model:"openrouter/free", client:{complete} });
    expect(result.plan).not.toHaveProperty("shiftDate");
    expect(result.plan).not.toHaveProperty("crewSize");
    expect(result.plan.tasks[0]).not.toHaveProperty("durationMinutes");
    expect(result.plan.tasks[0]).not.toHaveProperty("requestedStart");
    expect(result.plan.tasks[0]).not.toHaveProperty("requestedEnd");
  });

  it("does not use the new-worker number as evidence for crew size or vice versa", async () => {
    const swapped = { ...validPlan, crewSize:2, nonAcclimatizedWorkers:8, tasks:[] };
    const complete = vi.fn().mockResolvedValue({ content:JSON.stringify(swapped), model:"free-model" });
    const result = await extractPlan("Riyadh site has a crew of 8 workers including 2 new workers. Work is planned.", { apiKey:"key", model:"openrouter/free", client:{complete} });
    expect(result.plan).not.toHaveProperty("crewSize");
    expect(result.plan).not.toHaveProperty("nonAcclimatizedWorkers");
  });

  it.each([
    ["الرياض", "riyadh"], ["جدة", "jeddah"], ["الدمام", "dammam"], ["مكة", "mecca"], ["المدينة", "medina"],
  ] as const)("supports the Arabic city alias %s", async (locationName, city) => {
    const complete = vi.fn().mockResolvedValue({ content:JSON.stringify({tasks:[],assumptions:[],missingInformation:[]}), model:"free-model" });
    const result = await extractPlan("خطة عمل ميدانية للفريق في الموقع", { apiKey:"key", model:"openrouter/free", client:{complete}, context:{locationName} });
    expect(result.plan.city).toBe(city);
  });

  it("retries exactly once after an invalid structured response",async()=>{
    const complete=vi.fn().mockResolvedValueOnce({content:"not-json",model:"first"}).mockResolvedValueOnce({content:JSON.stringify(validPlan),model:"second"});
    const result=await extractPlan("A meaningful plan description.",{apiKey:"key",model:"openrouter/free",client:{complete}});
    expect(complete).toHaveBeenCalledTimes(2);
    expect(result.metadata.actualModel).toBe("second");
  });

  it("rejects locally invalid provider output", async () => {
    const client: ChatCompletionsClient = { complete: vi.fn().mockResolvedValue({ content: JSON.stringify({ ...validPlan, city: "unsupported" }) }) };
    await expect(extractPlan("A meaningful work plan.", { apiKey: "key", model: "openrouter/free", client })).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE", status: 502 });
  });

  it.each([
    [new DOMException("Aborted", "AbortError"), "AI_TIMEOUT", 504],
    [{ status: 429 }, "AI_RATE_LIMITED", 429],
    [{ status: 401 }, "AI_UNAVAILABLE", 503],
    [{ status: 503 }, "AI_UNAVAILABLE", 503],
  ])("maps provider failures to typed errors", async (failure, code, status) => {
    const client: ChatCompletionsClient = { complete: vi.fn().mockRejectedValue(failure) };
    await expect(extractPlan("A meaningful plan description.", { apiKey: "key", model: "openrouter/free", client })).rejects.toMatchObject({ code, status });
    expect(client.complete).toHaveBeenCalledOnce();
  });
});
