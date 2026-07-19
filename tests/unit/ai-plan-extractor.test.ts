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
  it("uses an OpenAI-compatible provider and validates structured output", async () => {
    const complete = vi.fn().mockResolvedValue({ content: JSON.stringify(validPlan), model:"google/gemma-free" });
    const result = await extractPlan("Eight workers will trench in Riyadh.", {
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
