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
    const complete = vi.fn().mockResolvedValue({ content: JSON.stringify(validPlan) });
    const result = await extractPlan("Eight workers will trench in Riyadh.", {
      apiKey: "test-key", model: "openrouter/free", client: { complete },
    });

    expect(result.city).toBe("riyadh");
    expect(result.tasks[0]).toMatchObject({ requestedStart:"11:30", requestedEnd:"13:30" });
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({
      model: "openrouter/free",
      responseFormat: expect.objectContaining({ type: "json_schema" }),
    }));
  });

  it("rejects locally invalid provider output", async () => {
    const client: ChatCompletionsClient = { complete: vi.fn().mockResolvedValue({ content: JSON.stringify({ ...validPlan, city: "unsupported" }) }) };
    await expect(extractPlan("A meaningful work plan.", { apiKey: "key", model: "openrouter/free", client })).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE", status: 502 });
  });

  it.each([
    [new DOMException("Aborted", "AbortError"), "AI_TIMEOUT", 504],
    [{ status: 429 }, "AI_RATE_LIMITED", 429],
    [{ status: 503 }, "AI_UNAVAILABLE", 503],
  ])("maps provider failures to typed errors", async (failure, code, status) => {
    const client: ChatCompletionsClient = { complete: vi.fn().mockRejectedValue(failure) };
    await expect(extractPlan("A meaningful plan description.", { apiKey: "key", model: "openrouter/free", client })).rejects.toMatchObject({ code, status });
  });
});
