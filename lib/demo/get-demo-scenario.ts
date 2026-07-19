import { DEMO_SCENARIO, type DemoScenario } from "../../data/demo-scenario";

export function getDemoScenario(): DemoScenario {
  return structuredClone(DEMO_SCENARIO);
}
