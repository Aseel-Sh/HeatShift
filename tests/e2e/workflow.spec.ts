import { expect, test, type Page } from "@playwright/test";

async function mockIntegrations(page: Page, weatherOk = true) {
  await page.route("**/api/parse-plan", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tasks: [{ nameEn: "Pipe inspection", nameAr: "فحص الأنابيب", durationMinutes: 30, workload: "light", environment: "shaded_outdoor", splittable: false }], assumptions: [], missingInformation: [] } }) }));
  await page.route("**/api/weather?*", (route) => route.fulfill({ status: weatherOk ? 200 : 502, contentType: "application/json", body: weatherOk ? JSON.stringify({ data: { city: "riyadh", date: "2026-07-20", hours: [{ time:"06:30",temperatureCelsius:31,apparentTemperatureCelsius:33,relativeHumidityPercent:25,windSpeedKph:8 },{ time:"12:30",temperatureCelsius:44,apparentTemperatureCelsius:47,relativeHumidityPercent:18,windSpeedKph:10 }] } }) : JSON.stringify({ error: { code:"WEATHER_UNAVAILABLE",message:"Forecast service unavailable for test." } }) }));
}

async function fillPlan(page: Page, overrides: { start?: string; end?: string; crew?: string; newWorkers?: string } = {}) {
  await page.getByLabel("Site name").fill("Test site");
  await page.getByLabel("City").selectOption("riyadh");
  await page.getByLabel("Shift date").fill("2026-07-20");
  await page.getByLabel("Shift start").fill(overrides.start ?? "06:30");
  await page.getByLabel("Shift end").fill(overrides.end ?? "16:30");
  await page.getByLabel("Crew size").fill(overrides.crew ?? "8");
  await page.getByLabel("Non-acclimatized workers").fill(overrides.newWorkers ?? "2");
}

test.beforeEach(async ({ page }) => { await mockIntegrations(page); await page.goto("/"); });

test("loads demo scenario and reaches Conditions without integration calls", async ({ page }) => {
  let calls = 0;
  await page.unroute("**/api/parse-plan"); await page.unroute("**/api/weather?*");
  await page.route("**/api/**", route => { calls += 1; return route.abort(); });
  await page.getByRole("button", { name: "Load demo scenario" }).click();
  await expect(page.getByRole("heading", { name: "Verify and edit every task" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByRole("heading", { name: "Select planning conditions" })).toBeVisible();
  await expect(page.getByLabel("Hourly forecast")).toBeVisible(); expect(calls).toBe(0);
});

test("manually creates a task without Gemini", async ({ page }) => {
  await fillPlan(page); await page.getByRole("button", { name: "Create tasks manually" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill("Manual cleanup"); await page.getByLabel("Arabic name").fill("تنظيف يدوي");
  await expect(page.getByLabel("English name")).toHaveValue("Manual cleanup");
});

test("edits a demo task", async ({ page }) => {
  await page.getByRole("button", { name: "Load demo scenario" }).click();
  await page.getByLabel("English name").first().fill("Edited heavy trenching");
  await expect(page.getByLabel("English name").first()).toHaveValue("Edited heavy trenching");
});

test("blocks invalid shift times", async ({ page }) => {
  await fillPlan(page,{start:"16:00",end:"06:00"}); await page.getByRole("button", { name: "Create tasks manually" }).click();
  await expect(page.getByText(/Shift end must be after shift start/)).toBeVisible();
});

test("blocks non-acclimatized workers greater than crew", async ({ page }) => {
  await fillPlan(page,{crew:"4",newWorkers:"5"}); await page.getByRole("button", { name: "Create tasks manually" }).click();
  await expect(page.getByText("New workers cannot exceed crew size.")).toBeVisible();
});

test("Arabic toggle changes direction and labels", async ({ page }) => {
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
  await expect(page.getByRole("heading", { name: "خطط لوردية خارجية أكثر أمانًا" })).toBeVisible();
  await expect(page.getByLabel("اسم الموقع")).toBeVisible();
});

test("weather failure exposes the manual preliminary path", async ({ page }) => {
  await page.unroute("**/api/weather?*"); await page.route("**/api/weather?*", route => route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({error:{code:"WEATHER_UNAVAILABLE",message:"Forecast service unavailable for test."}})}));
  await fillPlan(page); await page.getByRole("button", { name: "Create tasks manually" }).click(); await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill("Inspection"); await page.getByLabel("Arabic name").fill("فحص"); await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByText("Forecast unavailable")).toBeVisible(); await expect(page.getByText(/No weather values were invented/)).toBeVisible();
  await expect(page.getByText("Preliminary forecast plan. Exact TWL recovery cycles will not be claimed.")).toBeVisible();
});
