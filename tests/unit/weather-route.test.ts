import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/weather/route";

describe("GET /api/weather", () => {
  it.each([
    ["91", "46.6", "2026-07-20", "Asia/Riyadh"],
    ["24.7", "181", "2026-07-20", "Asia/Riyadh"],
    ["24.7", "46.6", "20-07-2026", "Asia/Riyadh"],
    ["24.7", "46.6", "2026-07-20", "../../etc/passwd"],
  ])("rejects invalid coordinate/date/timezone input", async (latitude,longitude,date,timezone) => {
    const response = await GET(
      new Request(`http://localhost/api/weather?latitude=${latitude}&longitude=${longitude}&date=${date}&timezone=${encodeURIComponent(timezone)}&locationName=Site`),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "INVALID_INPUT" },
    });
  });
});
