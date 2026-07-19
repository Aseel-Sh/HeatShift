import { describe, expect, it } from "vitest";
import { formatDuration } from "../../lib/workflow/format-duration";

describe("human-readable activity durations", () => {
  it.each([[30, "30 min"], [60, "1 hr"], [75, "1 hr 15 min"], [150, "2 hr 30 min"]])("formats %i minutes", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
