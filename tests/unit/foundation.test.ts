import { describe, expect, it } from "vitest";
import {
  projectScope,
  projectScopeSchema,
} from "../../lib/domain/project-scope";

describe("project foundation", () => {
  it("keeps safety decisions deterministic", () => {
    expect(projectScopeSchema.parse(projectScope).safetyDecisionMode).toBe(
      "deterministic",
    );
  });
});
