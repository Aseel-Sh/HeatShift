import { expect, test } from "@playwright/test";

async function fillManualPlan(page: import("@playwright/test").Page, overrides: { start?: string; end?: string; crew?: string; newWorkers?: string } = {}) {
  await page.getByLabel("Site name").fill("QA site");
  await page.getByRole("button", { name: "Riyadh", exact: true }).click();
  await page.getByLabel("Shift date").fill("2026-07-20");
  await page.getByLabel("Shift start").fill(overrides.start ?? "06:30");
  await page.getByLabel("Shift end").fill(overrides.end ?? "16:30");
  await page.getByLabel("Crew size").fill(overrides.crew ?? "4");
  await page.getByLabel("Non-acclimatized workers").fill(overrides.newWorkers ?? "0");
}

async function addManualTask(page: import("@playwright/test").Page, name = "Manual inspection") {
  await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill(name);
  await page.getByLabel("Arabic name").fill("فحص يدوي طويل للاختبار");
  await page.getByLabel("Duration (minutes)").fill("30");
  await page.getByLabel("Workload").selectOption("light");
  await page.getByLabel("Environment").selectOption("shaded_outdoor");
  await page.getByLabel("May this task be split?").selectOption("false");
}

test("AI can extract a text-first plan without duplicate requests", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/parse-plan", async (route) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {
        siteName: "Extracted site", city: "riyadh", shiftDate: "2026-07-20",
        shiftStart: "07:00", shiftEnd: "15:00", crewSize: 4,
        nonAcclimatizedWorkers: 0,
        tasks: [{ nameEn: "Inspection", nameAr: "فحص", durationMinutes: 30, workload: "light", environment: "shaded_outdoor", splittable: false }],
        assumptions: [], missingInformation: [],
      }, metadata:{actualModel:"google/gemma-test:free"} }),
    });
  });
  await page.goto("/");
  await page.getByLabel("Import work plan").fill("Four workers inspect the Riyadh site from 07:00 to 15:00 on 2026-07-20.");
  await page.getByRole("button", { name: "Structure task list" }).dblclick();

  await expect(page.getByRole("heading", { name: "Task plan" })).toBeVisible();
  await page.getByRole("button", { name: /Expand details: Inspection/ }).click();
  await expect(page.getByLabel("English name")).toHaveValue("Inspection");
  await expect(page.getByText("Plan structured using google/gemma-test:free. Review required.")).toBeVisible();
  expect(requests).toBe(1);
});

test("demo is console-clean, network-clean, and stable under duplicate Generate", async ({ page }) => {
  const consoleErrors: string[] = []; const pageErrors: string[] = []; const failedRequests: string[] = [];
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => failedRequests.push(`${request.method()} ${request.url()}`));
  await page.goto("/");
  await page.getByRole("button", { name: "View sample shift" }).click();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).dblclick();
  await expect(page.locator("h1")).toHaveText("Generated safer schedule");
  expect(consoleErrors).toEqual([]); expect(pageErrors).toEqual([]); expect(failedRequests).toEqual([]);
});

test("manual entry completes without AI and renders user text safely", async ({ page }) => {
  await page.route("**/api/weather?*", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { locationName:"Riyadh",latitude:24.7136,longitude:46.6753,timezone:"Asia/Riyadh",date:"2026-07-20",retrievedAt:"2026-07-19T09:00:00Z",hours: [{ time:"06:00",temperatureCelsius:30,apparentTemperatureCelsius:31,relativeHumidityPercent:25,windSpeedKph:8 }] } }) }));
  await page.goto("/"); await fillManualPlan(page); await addManualTask(page, '<img src=x onerror="window.__qaXss=1">');
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.getByText('<img src=x onerror="window.__qaXss=1">', { exact: true }).first()).toBeVisible();
  expect(await page.locator("img[src=x]").count()).toBe(0);
  expect(await page.evaluate(() => (window as typeof window & { __qaXss?: number }).__qaXss)).toBeUndefined();
});

for (const failure of [
  ["missing key", 503, "AI_NOT_CONFIGURED", "AI plan extraction is not configured."],
  ["timeout", 504, "AI_TIMEOUT", "Plan extraction timed out. Try again or create tasks manually."],
  ["rate limit", 429, "AI_RATE_LIMITED", "The free AI service is busy or rate limited. Try again later or create tasks manually."],
  ["invalid JSON", 502, "AI_INVALID_RESPONSE", "Plan extraction returned an invalid response."],
  ["network failure", 503, "AI_UNAVAILABLE", "Plan extraction is temporarily unavailable. Create tasks manually or try again later."],
] as const) {
  test(`AI ${failure[0]} is recoverable`, async ({ page }) => {
    await page.route("**/api/parse-plan", route => route.fulfill({ status: failure[1], contentType: "application/json", body: JSON.stringify({ error: { code: failure[2], message: failure[3] } }) }));
    await page.goto("/"); await page.getByLabel("Import work plan").fill("A sufficiently meaningful work plan for extraction.");
    await page.getByRole("button", { name: "Structure task list" }).click();
    await expect(page.getByRole("alert").filter({ hasText: failure[3] })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter tasks manually" })).toBeEnabled();
  });
}

for (const failure of ["timeout", "invalid response", "unsupported date", "empty hourly data"] as const) {
  test(`weather ${failure} exposes a preliminary path`, async ({ page }) => {
    await page.route("**/api/weather?*", route => route.fulfill({ status: failure === "unsupported date" ? 422 : 502, contentType: "application/json", body: JSON.stringify({ error: { code: `WEATHER_${failure.toUpperCase().replaceAll(" ", "_")}`, message: `Weather ${failure}.` } }) }));
    await page.goto("/"); await fillManualPlan(page); await addManualTask(page);
    await page.getByRole("button", { name: "Continue to conditions" }).click();
    await expect(page.getByRole("alert").filter({ hasText: `Weather ${failure}.` })).toBeVisible();
    await expect(page.getByText("Preliminary only — no exact recovery cycle claimed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate safer shift" })).toBeEnabled();
  });
}

test("abusive form values and task data are announced and block progress", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await expect(page.locator("section").getByRole("alert")).toHaveCount(7);
  await expect(page.getByLabel(/^Site name/)).toHaveAttribute("aria-invalid", "true");
  await fillManualPlan(page, { crew: "0", newWorkers: "-1", start: "16:00", end: "06:00" });
  await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await expect(page.getByText("Crew size must be a positive whole number.")).toBeVisible();
  await expect(page.getByText("New workers must be zero or a positive whole number.")).toBeVisible();
  await expect(page.getByText(/overnight shifts are not supported/)).toBeVisible();
  await page.getByLabel(/^Crew size/).fill("4"); await page.getByLabel(/^Non-acclimatized workers/).fill("0"); await page.getByLabel(/^Shift start/).fill("06:30"); await page.getByLabel(/^Shift end/).fill("06:35");
  await page.getByRole("button", { name: "Enter tasks manually" }).click();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByText("Add at least one task before continuing.")).toBeVisible();
  await page.getByRole("button", { name: "Add task" }).click();
  await page.getByLabel("English name").fill("Too much work"); await page.getByLabel("Arabic name").fill("عمل كثير"); await page.getByLabel("Duration (minutes)").fill("0");
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await expect(page.getByText("Duration must be a positive multiple of five minutes.")).toBeVisible();
  await expect(page.getByLabel(/^Duration \(minutes\)/)).toHaveAttribute("aria-invalid", "true");
});

test("responsive layouts, long bilingual names, headings, and keyboard focus remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/");
  await page.keyboard.press("Tab"); await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  const headingLevels = await page.locator("h1,h2,h3,h4").evaluateAll(elements => elements.map(element => Number(element.tagName.slice(1))));
  expect(headingLevels[0]).toBe(1); expect(headingLevels.some((level, index) => index > 0 && level - headingLevels[index - 1] > 1)).toBe(false);
  await page.getByRole("button", { name: "View sample shift" }).click();
  await page.getByRole("button", { name: /^Expand details:/ }).first().click();
  await page.getByLabel("English name").first().fill("L".repeat(240)); await page.getByLabel("Arabic name").first().fill("م".repeat(240));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 768, height: 1024 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("refresh behavior is explicit at every in-progress step", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: "View sample shift" }).click();
  await page.reload(); await expect(page.getByRole("heading", { name: "Shift setup" })).toBeVisible();
  await page.getByRole("button", { name: "View sample shift" }).click(); await page.getByRole("button", { name: "Continue to conditions" }).click();
  await page.reload(); await expect(page.getByRole("heading", { name: "Shift setup" })).toBeVisible();
  await page.getByRole("button", { name: "View sample shift" }).click(); await page.getByRole("button", { name: "Continue to conditions" }).click(); await page.getByRole("button", { name: "Generate safer shift" }).click();
  await page.reload(); await expect(page.getByRole("heading", { name: "Shift setup" })).toBeVisible();
});

test("keyboard-only activation and plan length limits remain usable", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Import work plan").fill("x".repeat(5001));
  expect((await page.getByLabel("Import work plan").inputValue()).length).toBe(5000);
  await page.getByRole("button", { name: "View sample shift" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Task plan" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to conditions" }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Generate safer shift" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Print supervisor report" })).toBeVisible();
});
