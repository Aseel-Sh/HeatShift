import { describe, expect, it, vi } from "vitest";
import {
  extractPlanWithGemini,
  type GeminiGenerateClient,
} from "../../lib/ai/gemini-plan-extractor";

describe("Gemini structured plan extraction", () => {
  it("validates and returns schema-conforming structured output", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        siteName: "Riyadh north yard",
        city: "riyadh",
        shiftDate: "2026-07-20",
        shiftStart: "06:30",
        shiftEnd: "16:30",
        crewSize: 8,
        nonAcclimatizedWorkers: 2,
        tasks: [
          {
            nameEn: "Trenching",
            nameAr: "حفر الخندق",
            durationMinutes: 120,
            workload: "heavy",
            environment: "direct_sun",
            splittable: true,
          },
        ],
        assumptions: ["Trenching was interpreted as heavy work."],
        missingInformation: [],
      }),
    });

    const result = await extractPlanWithGemini(
      "Eight workers will trench at the Riyadh north yard.",
      {
        apiKey: "test-key",
        model: "test-model",
        client: { generateContent } as GeminiGenerateClient,
      },
    );

    expect(result.city).toBe("riyadh");
    expect(result.tasks[0].nameAr).toBe("حفر الخندق");
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseJsonSchema: expect.any(Object),
        }),
      }),
    );
  });

  it("rejects invalid model output instead of accepting invented structure", async () => {
    const client: GeminiGenerateClient = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify({
          city: "unsupported-city",
          tasks: [{ nameEn: "Unknown task" }],
          assumptions: [],
          missingInformation: [],
        }),
      }),
    };

    await expect(
      extractPlanWithGemini("A meaningful but incomplete work plan.", {
        apiKey: "test-key",
        model: "test-model",
        client,
      }),
    ).rejects.toMatchObject({ code: "AI_INVALID_RESPONSE", status: 502 });
  });

  it.each([
    [new DOMException("Aborted", "AbortError"), "AI_TIMEOUT", 504],
    [{ status: 429 }, "AI_RATE_LIMITED", 429],
  ])("maps upstream failures to typed errors", async (failure, code, status) => {
    const client: GeminiGenerateClient = {
      generateContent: vi.fn().mockRejectedValue(failure),
    };

    await expect(
      extractPlanWithGemini("A meaningful plan description for extraction.", {
        apiKey: "test-key",
        model: "test-model",
        client,
      }),
    ).rejects.toMatchObject({ code, status });
  });
});
