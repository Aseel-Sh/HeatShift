import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/weather/route";

describe("GET /api/weather", () => {
  it.each([
    ["tabuk", "2026-07-20"],
    ["riyadh", "20-07-2026"],
  ])("rejects invalid city/date input", async (city, date) => {
    const response = await GET(
      new Request(`http://localhost/api/weather?city=${city}&date=${date}`),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});
