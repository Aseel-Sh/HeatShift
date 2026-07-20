import { expect, test, type Page } from "@playwright/test";

test.setTimeout(90_000);

const planText = `Crew A - Riyadh
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

const weatherHours = Array.from({ length: 11 }, (_, index) => ({
  time: `${String(index + 6).padStart(2, "0")}:00`,
  temperatureCelsius: 30 + index * 1.5,
  apparentTemperatureCelsius: 31.5 + index * 1.7,
  relativeHumidityPercent: 31 - index,
  windSpeedKph: 7 + index * 0.4,
}));

async function enterExactPlan(page: Page) {
  await page.getByLabel("Site name").fill("North utility site");
  const search = page.getByRole("combobox", { name: "Search location" });
  await search.fill("Riyadh");
  await page.getByRole("option", { name: /Riyadh Riyadh Region/ }).click();
  await page.getByLabel("Shift date").fill("2026-07-20");
  await page.getByLabel("Shift start").fill("06:00");
  await page.getByLabel("Shift end").fill("16:00");
  await page.getByLabel("Crew size").fill("8");
  await page.getByLabel("Non-acclimatized workers").fill("2");
  await page.getByLabel("Import work plan").fill(planText);
  await page.getByRole("button", { name: "Structure task list" }).click();
}

async function confirmClassifications(page: Page) {
  const rows = page.getByTestId(/^task-row-/);
  await expect(rows).toHaveCount(8);
  await expect(rows.nth(0).getByText("Normal", { exact: true })).toBeVisible();
  await expect(rows.nth(5).getByText("Required today", { exact: true })).toBeVisible();
  const choices = [
    ["light", "conditioned_indoor", "false"],
    ["heavy", "direct_sun", "true"],
    null,
    ["heavy", "shaded_outdoor", "false"],
    null,
    ["heavy", "direct_sun", "true"],
    ["light", "shaded_outdoor", "false"],
    ["light", "direct_sun", "true"],
  ] as const;
  for (let index = 0; index < choices.length; index += 1) {
    const choice = choices[index];
    await rows.nth(index).getByRole("button", { name: "Edit", exact: true }).click();
    if (choice) {
      await page.getByLabel("Workload").selectOption(choice[0]);
      await page.getByLabel("Work area").selectOption(choice[1]);
      await page.getByLabel("Can split?").selectOption(choice[2]);
    } else {
      await page.getByLabel("Recovery eligibility").selectOption("eligible");
    }
    const dependency = new Map([[1,"Toolbox talk + prep"],[3,"Excavation"],[5,"Rebar + forms"],[6,"Concrete pour"],[7,"Finish + curing"]]).get(index);
    if (dependency) await page.getByRole("checkbox", { name: `After ${dependency}` }).check();
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
}

test.beforeEach(async ({ page }) => {
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
  await page.route("**/api/parse-plan", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { siteName: "North utility site", city: "riyadh", shiftDate: "2026-07-20", shiftStart: "06:00", shiftEnd: "16:00", crewSize: 8, nonAcclimatizedWorkers: 2, assumptions: [], missingInformation: [], tasks: rows.map(([nameEn, nameAr, activityKind, requestedStart, requestedEnd, durationMinutes, suggestedWorkload], index) => ({ nameEn, nameAr, activityKind, requestedStart, requestedEnd, durationMinutes, recoveryEligibility: activityKind === "work" ? undefined : "unknown", timingPreference: "preferred", mustSchedule: index === 5, operationalNotes: index === 5 ? ["Pump booked only today."] : [], suggestedWorkload, evidence: { durationMinutes: { value: durationMinutes, evidence: planText.split("\n")[index + 3], source: "deterministic_parser" }, ...(index === 5 ? { mustSchedule: { value: true, evidence: "Need concrete completed today.", source: "deterministic_parser" } } : {}) } })) } }) }));
  await page.route("**/api/locations?*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{ id: "geocoding-riyadh", name: "Riyadh", admin1: "Riyadh Region", countryCode: "SA", latitude: 24.6877, longitude: 46.7219, timezone: "Asia/Riyadh", source: "geocoding" }] }) }));
  await page.goto("/");
});

test("exact supervisor plan imports, confirms, and schedules in the production workflow", async ({ page }) => {
  let weatherUrl = "";
  await page.route("**/api/weather?*", (route) => {
    weatherUrl = route.request().url();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { locationName: "Riyadh", latitude: 24.6877, longitude: 46.7219, timezone: "Asia/Riyadh", date: "2026-07-20", retrievedAt: "2026-07-19T12:00:00Z", hours: weatherHours } }) });
  });
  await enterExactPlan(page);

  const rows = page.getByTestId(/^task-row-/);
  await expect(rows).toHaveCount(8);
  await expect(page.getByText("Shift details need attention")).toHaveCount(0);
  await expect(page.getByText("Crew size not stated")).toHaveCount(0);
  await expect(page.getByText("Shift start not stated")).toHaveCount(0);
  await expect(page.getByText("Shift end not stated")).toHaveCount(0);
  await expect(rows.nth(2)).toContainText("Break");
  await expect(rows.nth(4)).toContainText("Meal");
  await expect(rows.nth(5)).toContainText("Required today");
  await expect(rows.nth(5)).toContainText("12:00–14:30");
  await rows.nth(5).getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Operational notes")).toHaveValue("Pump booked only today.");
  await page.getByText("Source evidence").click();
  await expect(page.getByText("Need concrete completed today.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Requested start")).toHaveValue("12:00");
  await expect(page.getByLabel("Requested end")).toHaveValue("14:30");
  expect(await page.getByRole("dialog").getByText(/suggestion:/i).count()).toBeGreaterThan(0);
  await expect(page.getByRole("dialog").locator('[data-suggestion-field="dependency"]')).toHaveCSS("grid-row-start","10");
  await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
  await page.screenshot({ path: "artifacts/regression-work-plan/01-import-review.png", fullPage: true });

  await confirmClassifications(page);
  for (const [index, dependency] of [[1,"Toolbox talk + prep"],[3,"Excavation"],[5,"Rebar + forms"],[6,"Concrete pour"],[7,"Finish + curing"]] as const) {
    await rows.nth(index).getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: `After ${dependency}` })).toBeChecked();
    await page.getByRole("button", { name: "Cancel", exact: true }).last().click();
  }
  await page.screenshot({ path: "artifacts/regression-work-plan/02-supervisor-confirmed-plan-views.png", fullPage: true });
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  expect(weatherUrl).toContain("latitude=24.6877");
  expect(weatherUrl).toContain("longitude=46.7219");
  expect(weatherUrl).toContain("timezone=Asia%2FRiyadh");
  await expect(page.getByText("Model forecast for selected coordinates — preliminary planning only.")).toBeVisible();
  await expect(page.getByText("This is not an on-site measurement. TWL is not calculated from the weather forecast.")).toBeVisible();
  await expect(page.getByText(/2026-07-19 · 15:00 · Saudi Arabia Standard Time \(UTC\+3\)/)).toBeVisible();
  await page.getByText("Low", { exact: true }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.locator("h1")).toHaveText("Generated safer schedule");
  await expect(page.locator(".result-timezone")).toContainText("All schedule times use Saudi Arabia Standard Time (Asia/Riyadh, UTC+3).");
  await expect(
    page.getByTestId("generated-plan-section").getByRole("row", { name: /Concrete pour.*Required today/ }),
  ).toBeVisible();
  await expect(page.getByText("high priority", { exact: false })).toHaveCount(0);
  await page.locator(".selection-details").getByText("How this schedule was selected", { exact: true }).click();
  await expect(page.locator(".selection-details")).toContainText("Required-today activities are prioritized before normal activities, but HeatShift will not violate restrictions, recovery rules, fixed timing, or dependencies to force them into the shift.");

  for (const name of ["Excavation", "Concrete pour", "Cleanup"]) {
    const taskId = await page.getByTestId("requested-crew-board").locator("[data-requested-id]", { hasText: name }).getAttribute("data-requested-id");
    const directSun = page.getByTestId("generated-crew-board").locator(`[data-block-type="work"][data-task-id="${taskId}"]`);
    for (let index = 0; index < await directSun.count(); index += 1) {
      const start = await directSun.nth(index).getAttribute("data-start");
      const end = await directSun.nth(index).getAttribute("data-end");
      expect(end! <= "12:00" || start! >= "15:00", `${name} ${start}–${end}`).toBe(true);
    }
  }
  await expect(page.getByText("globally optimal", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Time not specified", { exact: true })).toHaveCount(0);
  await expect(page.getByText("This shift cannot accommodate all planned work under the selected conditions.")).toBeVisible();
  await expect(page.locator(".required-incomplete")).toContainText("Required-today work remains incomplete.");
  await expect(page.getByRole("heading", { name: "Plan outcome" })).toBeVisible();
  await expect(page.getByText("Forecast heat category:", { exact: true })).toBeVisible();
  await expect(page.getByText("Applied TWL zone:", { exact: true })).toBeVisible();
  await expect(page.getByText(/Low TWL provides continuous-work guidance/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "No requested time" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Could not be scheduled" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Original requested versus generated" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Concrete pour.*2 hr 30 min.*1 hr 30 min.*1 hr/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Concrete pour.*Partially scheduled/ })).toBeVisible();
  await page.screenshot({ path: "artifacts/regression-work-plan/03-selected-schedule.png", fullPage: true });

  const excavationRequested = page.getByTestId("requested-crew-board").locator("[data-requested-id]", { hasText: "Excavation" });
  const excavationId = await excavationRequested.getAttribute("data-requested-id");
  await excavationRequested.click();
  expect(await page.locator(`.scheduled-block.linked[data-task-id="${excavationId}"]`).count()).toBeGreaterThan(0);
  const excavationDetails = page.locator(".block-drawer");
  await expect(excavationDetails.getByRole("heading", { name: "Excavation" })).toBeVisible();
  await expect(excavationDetails.getByText("Generated work times", { exact: true }).locator("xpath=following-sibling::dd")).not.toHaveText("—");
  await page.screenshot({ path: "artifacts/regression-work-plan/04-excavation-linked.png", fullPage: true });

  await page.getByTestId("requested-crew-board").locator("[data-requested-id]", { hasText: "Concrete pour" }).click();
  await expect(page.locator(".block-drawer").getByText("Required today", { exact: true })).toBeVisible();
  await expect(page.locator(".block-drawer").getByText("Pump booked only today.")).toBeVisible();
  await page.screenshot({ path: "artifacts/regression-work-plan/05-concrete-details.png", fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/regression-work-plan/06-mobile.png", fullPage: true });

  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page
      .getByTestId("generated-plan-section")
      .getByRole("heading", { name: "الجدول المُنشأ لوردية أكثر أمانًا", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/regression-work-plan/07-arabic.png", fullPage: true });

  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-action")).toBeHidden();
  await page.screenshot({ path: "artifacts/regression-work-plan/08-print.png", fullPage: true });
});
