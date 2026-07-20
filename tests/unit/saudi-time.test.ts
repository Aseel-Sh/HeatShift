import { describe, expect, it } from "vitest";
import { formatSaudiRetrievedAt, SAUDI_TIME_ZONE, saudiTimeZoneSentence } from "../../lib/i18n/saudi-time";

describe("Saudi operational time", () => {
  it("uses one explicit IANA zone and bilingual setup copy", () => {
    expect(SAUDI_TIME_ZONE).toBe("Asia/Riyadh");
    expect(saudiTimeZoneSentence("en")).toBe("All schedule times use Saudi Arabia Standard Time (Asia/Riyadh, UTC+3).");
    expect(saudiTimeZoneSentence("ar")).toBe("جميع أوقات الجدول بتوقيت المملكة العربية السعودية (Asia/Riyadh، UTC+3).");
  });

  it("converts UTC retrieval timestamps to Riyadh local time without exposing ISO text", () => {
    const displayed = formatSaudiRetrievedAt("2026-07-19T09:00:00.000Z", "en");
    expect(displayed).toBe("2026-07-19 · 12:00 · Saudi Arabia Standard Time (UTC+3)");
    expect(displayed).not.toContain("T09:00:00.000Z");
  });
});
