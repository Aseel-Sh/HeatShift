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
});
