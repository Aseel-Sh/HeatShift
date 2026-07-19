import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "../../app/api/parse-plan/route";

describe("POST /api/parse-plan", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects empty plan text with a typed error", async () => {
    const response = await POST(
      new Request("http://localhost/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Plan text must contain at least 10 meaningful characters.",
      },
    });
  });

  it("rejects text that has length but no meaningful content", async () => {
    const response = await POST(
      new Request("http://localhost/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "----------" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });

  it("returns AI_NOT_CONFIGURED when the server key is absent", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const response = await POST(
      new Request("http://localhost/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "Eight workers will prepare the Riyadh yard." }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "AI_NOT_CONFIGURED",
        message: "AI plan extraction is not configured.",
      },
    });
  });

  it("imports deterministic schedule rows even when AI is not configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const response = await POST(new Request("http://localhost/api/parse-plan", {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        text:"6:30-9:00 Excavation\n9:00-9:15 Break",
        context:{siteName:"North utility site",locationName:"Riyadh",shiftDate:"2026-07-20",shiftStart:"06:00",shiftEnd:"16:30",crewSize:8,nonAcclimatizedWorkers:2},
      }),
    }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.metadata.actualModel).toBeNull();
    expect(payload.data.tasks).toMatchObject([
      {activityKind:"work",requestedStart:"06:30",requestedEnd:"09:00",durationMinutes:150},
      {activityKind:"break",requestedStart:"09:00",requestedEnd:"09:15",durationMinutes:15},
    ]);
  });

  it("rejects unsupported content types", async () => {
    const response = await POST(
      new Request("http://localhost/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "A sufficiently meaningful plan description.",
      }),
    );

    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });

  it("enforces the 5000-character plan-text limit", async () => {
    const response = await POST(
      new Request("http://localhost/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "x".repeat(5001) }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Plan text must not exceed 5000 characters.",
      },
    });
  });

  it("enforces the encoded 10 KiB request-body limit", async () => {
    const response = await POST(
      new Request("http://localhost/api/parse-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "工".repeat(5000) }),
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_INPUT", message: "Request body is too large." },
    });
  });
});
