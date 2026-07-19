import { expect, test, type Page } from "@playwright/test";

async function mockIntegrations(page: Page, weatherOk = true) {
  await page.route("**/api/parse-plan", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tasks: [{ nameEn: "Pipe inspection", nameAr: "فحص الأنابيب", durationMinutes: 30, workload: "light", environment: "shaded_outdoor", splittable: false }], assumptions: [], missingInformation: [] } }) }));
  await page.route("**/api/weather?*", (route) => route.fulfill({ status: weatherOk ? 200 : 502, contentType: "application/json", body: weatherOk ? JSON.stringify({ data: { city: "riyadh", date: "2026-07-20", retrievedAt:"2026-07-19T09:00:00Z", hours: [{ time:"06:30",temperatureCelsius:31,apparentTemperatureCelsius:33,relativeHumidityPercent:25,windSpeedKph:8 },{ time:"12:30",temperatureCelsius:44,apparentTemperatureCelsius:47,relativeHumidityPercent:18,windSpeedKph:10 }] } }) : JSON.stringify({ error: { code:"WEATHER_UNAVAILABLE",message:"Forecast service unavailable for test." } }) }));
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
  await page.getByRole("button", { name: "Load sample shift" }).click();
  await expect(page.getByRole("heading", { name: "Verify and edit every task" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByRole("heading", { name: "Select planning conditions" })).toBeVisible();
  await expect(page.getByLabel("Hourly forecast")).toBeVisible(); expect(calls).toBe(0);
});

test("manually creates a task without AI", async ({ page }) => {
  await fillPlan(page); await page.getByRole("button", { name: "Create tasks manually" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill("Manual cleanup"); await page.getByLabel("Arabic name").fill("تنظيف يدوي");
  await expect(page.getByLabel("English name")).toHaveValue("Manual cleanup");
});

test("edits a demo task", async ({ page }) => {
  await page.getByRole("button", { name: "Load sample shift" }).click();
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
  await page.getByLabel("English name").fill("Inspection"); await page.getByLabel("Arabic name").fill("فحص"); await page.getByLabel("Duration (minutes)").fill("30"); await page.getByLabel("Workload").selectOption("light"); await page.getByLabel("Environment").selectOption("shaded_outdoor"); await page.getByLabel("May this task be split?").selectOption("false"); await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByText("Forecast unavailable")).toBeVisible(); await expect(page.getByText(/No weather values were invented/)).toBeVisible();
  await expect(page.getByText("Preliminary forecast plan. Exact TWL recovery cycles will not be claimed.")).toBeVisible();
});

test("missing AI safety fields remain blank and block scheduling", async ({ page }) => {
  await page.unroute("**/api/parse-plan");
  await page.route("**/api/parse-plan", route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{siteName:"AI Site",city:"riyadh",shiftDate:"2026-07-20",shiftStart:"06:30",shiftEnd:"16:30",crewSize:8,nonAcclimatizedWorkers:0,tasks:[{nameEn:"Unknown",nameAr:"غير محدد"}],assumptions:[],missingInformation:["Task details missing"]}})}));
  await page.getByLabel("Natural-language work plan").fill("Eight workers have an unspecified task tomorrow morning.");
  await page.getByRole("button",{name:"Analyze plan"}).click();
  await expect(page.getByLabel("Duration (minutes)")).toHaveValue("");
  await expect(page.getByLabel("Workload")).toHaveValue("");
  await expect(page.getByLabel("Environment")).toHaveValue("");
  await page.getByRole("button",{name:"Continue to conditions"}).click();
  await expect(page.getByText("Select a workload.")).toBeVisible();
});

test("editing a sample invalidates it and requests weather for the edited city", async ({ page }) => {
  let weatherUrl="";
  await page.unroute("**/api/weather?*");
  await page.route("**/api/weather?*",route=>{weatherUrl=route.request().url();return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{city:"jeddah",date:"2026-07-20",retrievedAt:"2026-07-19T09:00:00Z",hours:[{time:"06:30",temperatureCelsius:32,apparentTemperatureCelsius:34,relativeHumidityPercent:40,windSpeedKph:8}]}})});});
  await page.getByRole("button",{name:"Load sample shift"}).click();
  await page.getByRole("button",{name:"Back"}).click();
  await page.getByLabel("City").selectOption("jeddah");
  await page.getByRole("button",{name:"Create tasks manually"}).click();
  await expect(page.getByText("Sample data — no live AI or weather request")).toHaveCount(0);
  await page.getByRole("button",{name:"Continue to conditions"}).click();
  expect(weatherUrl).toContain("city=jeddah");
  await expect(page.getByText("46.7°")).toHaveCount(0);
  await expect(page.getByText("City-center model forecast — preliminary planning only.")).toBeVisible();
  await expect(page.getByText(/City: jeddah/)).toBeVisible();
});
