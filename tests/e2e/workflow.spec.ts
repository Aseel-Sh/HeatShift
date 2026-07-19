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
  await page.getByRole("button", { name: "View sample shift" }).click();
  await expect(page.getByRole("heading", { name: "Task plan" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByRole("heading", { name: "Conditions" })).toBeVisible();
  await expect(page.getByLabel("Hourly forecast")).toBeVisible(); expect(calls).toBe(0);
});

test("manually creates a task without AI", async ({ page }) => {
  await fillPlan(page); await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill("Manual cleanup"); await page.getByLabel("Arabic name").fill("تنظيف يدوي");
  await expect(page.getByLabel("English name")).toHaveValue("Manual cleanup");
});

test("edits a demo task", async ({ page }) => {
  await page.getByRole("button", { name: "View sample shift" }).click();
  await page.getByLabel("English name").first().fill("Edited heavy trenching");
  await expect(page.getByLabel("English name").first()).toHaveValue("Edited heavy trenching");
});

test("blocks invalid shift times", async ({ page }) => {
  await fillPlan(page,{start:"16:00",end:"06:00"}); await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await expect(page.getByText(/Shift end must be after shift start/)).toBeVisible();
});

test("blocks non-acclimatized workers greater than crew", async ({ page }) => {
  await fillPlan(page,{crew:"4",newWorkers:"5"}); await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await expect(page.getByText("New workers cannot exceed crew size.")).toBeVisible();
});

test("Arabic toggle changes direction and labels", async ({ page }) => {
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir","rtl");
  await expect(page.getByRole("heading", { name: "إعداد الوردية" })).toBeVisible();
  await expect(page.getByLabel("اسم الموقع")).toBeVisible();
});

test("weather failure exposes the manual preliminary path", async ({ page }) => {
  await page.unroute("**/api/weather?*"); await page.route("**/api/weather?*", route => route.fulfill({status:502,contentType:"application/json",body:JSON.stringify({error:{code:"WEATHER_UNAVAILABLE",message:"Forecast service unavailable for test."}})}));
  await fillPlan(page); await page.getByRole("button", { name: "Enter tasks manually" }).click(); await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill("Inspection"); await page.getByLabel("Arabic name").fill("فحص"); await page.getByLabel("Duration (minutes)").fill("30"); await page.getByLabel("Workload").selectOption("light"); await page.getByLabel("Environment").selectOption("shaded_outdoor"); await page.getByLabel("May this task be split?").selectOption("false"); await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByText("Forecast unavailable")).toBeVisible(); await expect(page.getByText(/No weather values were invented/)).toBeVisible();
  await expect(page.getByText("Preliminary only — no exact recovery cycle claimed")).toBeVisible();
});

test("missing AI safety fields remain blank and block scheduling", async ({ page }) => {
  await page.unroute("**/api/parse-plan");
  await page.route("**/api/parse-plan", route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({data:{siteName:"AI Site",city:"riyadh",shiftDate:"2026-07-20",shiftStart:"06:30",shiftEnd:"16:30",crewSize:8,nonAcclimatizedWorkers:0,tasks:[{nameEn:"Unknown",nameAr:"غير محدد"}],assumptions:[],missingInformation:["Task details missing"]}})}));
  await page.getByLabel("Import work plan").fill("Eight workers have an unspecified task tomorrow morning.");
  await page.getByRole("button",{name:"Structure task list"}).click();
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
  await page.getByRole("button",{name:"View sample shift"}).click();
  await page.getByRole("button",{name:"Back"}).click();
  await page.getByLabel("City").selectOption("jeddah");
  await page.getByRole("button",{name:"Enter tasks manually"}).click();
  await expect(page.getByText("Sample data — no live AI or weather request")).toHaveCount(0);
  await page.getByRole("button",{name:"Continue to conditions"}).click();
  expect(weatherUrl).toContain("city=jeddah");
  await expect(page.getByText("46.7°")).toHaveCount(0);
  await expect(page.getByText("City-center model forecast — preliminary planning only.")).toBeVisible();
  await expect(page.getByText(/Jeddah · Forecast date/)).toBeVisible();
});

test("imports the exact structured plan with contextual fields, activities, evidence, and readable durations", async ({ page }) => {
  const regressionText = `Crew A - Riyadh
Start 6:00 AM

6:00-6:30 Toolbox talk + prep
6:30-9:00 Excavation
9:00-9:15 Break
9:15-11:30 Rebar + forms
11:30-12:00 Lunch
12:00-2:30 Concrete pour
2:30-3:00 Finish + curing
3:00-4:00 Cleanup

Need concrete completed today. Pump booked only today.`;
  let posted: Record<string, unknown> | undefined;
  await page.unroute("**/api/parse-plan");
  await page.route("**/api/parse-plan", async (route) => {
    posted = route.request().postDataJSON();
    const rows = [
      ["Toolbox talk + prep", "حديث السلامة والتجهيز", "work", "06:00", "06:30", 30, "light"],
      ["Excavation", "الحفر", "work", "06:30", "09:00", 150, "heavy"],
      ["Break", "استراحة", "break", "09:00", "09:15", 15],
      ["Rebar + forms", "حديد التسليح والقوالب", "work", "09:15", "11:30", 135, "heavy"],
      ["Lunch", "غداء", "meal", "11:30", "12:00", 30],
      ["Concrete pour", "صب الخرسانة", "work", "12:00", "14:30", 150, "heavy"],
      ["Finish + curing", "الإنهاء والمعالجة", "work", "14:30", "15:00", 30, "light"],
      ["Cleanup", "التنظيف", "work", "15:00", "16:00", 60, "light"],
    ];
    const tasks = rows.map(([nameEn, nameAr, activityKind, requestedStart, requestedEnd, durationMinutes, suggestedWorkload], index) => ({
      nameEn, nameAr, activityKind, requestedStart, requestedEnd, durationMinutes,
      recoveryEligibility: activityKind === "work" ? undefined : "unknown",
      timingPreference: "preferred",
      mustSchedule: index === 5,
      operationalNotes: index === 5 ? ["Pump booked only today."] : [],
      suggestedWorkload,
      evidence: { durationMinutes: { value: durationMinutes, evidence: regressionText.split("\n")[index + 3], source: "deterministic_parser" } },
    }));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { siteName:"North utility site", city:"riyadh", shiftDate:"2026-07-20", shiftStart:"06:00", shiftEnd:"16:30", crewSize:8, nonAcclimatizedWorkers:2, tasks, assumptions:[], missingInformation:[] } }) });
  });
  await page.getByLabel("Site name").fill("North utility site");
  await page.getByLabel("City").selectOption("riyadh");
  await page.getByLabel("Shift date").fill("2026-07-20");
  await page.getByLabel("Shift start").fill("06:00");
  await page.getByLabel("Shift end").fill("16:30");
  await page.getByLabel("Crew size").fill("8");
  await page.getByLabel("Non-acclimatized workers").fill("2");
  await page.getByLabel("Import work plan").fill(regressionText);
  await page.getByRole("button", { name: "Structure task list" }).click();

  expect(posted).toMatchObject({ context: { siteName:"North utility site", locationName:"riyadh", shiftDate:"2026-07-20", shiftStart:"06:00", shiftEnd:"16:30", crewSize:8, nonAcclimatizedWorkers:2 } });
  await expect(page.getByTestId(/^task-row-/)).toHaveCount(8);
  await expect(page.getByLabel("Activity").nth(2)).toHaveValue("break");
  await expect(page.getByLabel("Activity").nth(4)).toHaveValue("meal");
  await expect(page.getByText("2 hr 30 min")).toHaveCount(2);
  await expect(page.getByText("1 hr")).toBeVisible();
  await expect(page.getByText("Pump booked only today.")).toBeVisible();
  await expect(page.getByText("Shift details need attention")).toHaveCount(0);
  await expect(page.getByText("Crew size not stated")).toHaveCount(0);
  await expect(page.getByText("Shift end not stated")).toHaveCount(0);
  const excavation = page.getByTestId("task-row-1");
  await expect(excavation.getByText(/Suggested: Heavy/)).toBeVisible();
  await excavation.getByRole("button", { name: "Use suggestion" }).click();
  await expect(excavation.getByLabel("Workload")).toHaveValue("heavy");
});

test("shows all missing shift details and returns focus to the first invalid setup field", async ({ page }) => {
  await page.unroute("**/api/parse-plan");
  await page.route("**/api/parse-plan", route => route.fulfill({ status:200, contentType:"application/json", body:JSON.stringify({ data:{ tasks:[{ nameEn:"Inspection", nameAr:"فحص", activityKind:"work", durationMinutes:30, workload:"light", environment:"shaded_outdoor", splittable:false, recoveryEligibility:"unknown", mustSchedule:false, operationalNotes:[], timingPreference:"flexible" }], assumptions:[], missingInformation:[] } }) }));
  await page.getByLabel("Import work plan").fill("Inspect the material storage area before work.");
  await page.getByRole("button", { name:"Structure task list" }).click();
  await page.getByRole("button", { name:"Continue to conditions" }).click();
  const panel = page.getByRole("alert").filter({ hasText:"Shift details need attention" });
  await expect(panel).toContainText("Site name");
  await expect(panel).toContainText("Location");
  await expect(panel).toContainText("Shift date");
  await expect(panel).toContainText("Shift start");
  await expect(panel).toContainText("Shift end");
  await expect(panel).toContainText("Crew size");
  await expect(panel).toContainText("Non-acclimatized workers");
  await panel.getByRole("button", { name:"Edit shift details" }).click();
  await expect(page.getByLabel("Site name")).toBeFocused();
});
