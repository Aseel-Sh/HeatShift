import { expect, test, type Page } from "@playwright/test";

async function openDemoResults(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "View sample shift" }).click();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.locator("h1")).toHaveText("Generated safer schedule");
}

async function showGeneratedTimeline(page: Page) {
  const generated = page.getByTestId("generated-plan-section");
  await generated.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(generated.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
}

test("completes the demo scenario through results", async ({ page }) => {
  await openDemoResults(page);
  await expect(page.getByText("Supervisor-entered TWL", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Original requested plan / Generated safer schedule" })).toBeVisible();
  await expect(page.getByTestId("requested-shift-board")).toBeVisible();
  await expect(page.getByTestId("generated-execution-list")).toBeVisible();
  await page.locator(".selection-details").scrollIntoViewIfNeeded();
  await page.locator(".selection-details").getByText("How this schedule was selected").click();
  await expect(page.locator(".selection-details")).toContainText("HeatShift compared 6 deterministic schedule options");
  await expect(page.getByTestId("requested-plan-section").locator(".restriction-top-label")).toBeVisible();
  await expect(page.locator('[data-block-type="restriction"]')).toHaveCount(0);
});

test("original and generated plans keep independent accessible view switches", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDemoResults(page);
  const requested = page.getByTestId("requested-plan-section");
  const generated = page.getByTestId("generated-plan-section");
  await expect(requested.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(generated.getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");

  await requested.getByRole("tab", { name: "Execution list", exact: true }).click();
  await expect(requested.getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(generated.getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("requested-execution-list").locator('[data-activity-type="rest"]')).toHaveCount(0);
  await expect(page.getByTestId("generated-execution-list").locator('[data-block-type="rest"]')).not.toHaveCount(0);

  await generated.getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(generated.getByRole("tab", { name: "Timeline", exact: true })).toHaveAttribute("aria-selected", "true");
  await generated.getByRole("tab", { name: "Timeline", exact: true }).press("ArrowRight");
  await expect(generated.getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(requested.getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await openDemoResults(page);
  await expect(page.getByTestId("requested-plan-section").getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("generated-plan-section").getByRole("tab", { name: "Execution list", exact: true })).toHaveAttribute("aria-selected", "true");
});

test("requested task selection links every generated interval and uses human durations", async ({ page }) => {
  await openDemoResults(page);
  await page.locator('[data-requested-id="demo-trenching"]').click();
  await expect(page.getByText("Planned times", { exact: true })).toBeVisible();
  await expect(page.getByText("06:30–06:50, 06:50–07:30, 07:30–07:50, 07:50–08:30, 08:30–08:50, 08:50–09:30", { exact: true })).toBeVisible();
  await expect(page.locator('.scheduled-block.linked[data-task-id="demo-trenching"]')).toHaveCount(6);
  await expect(page.getByText("1 hr", { exact: true })).toBeVisible();
});

test("timeline scales, heat ribbon, and page containment remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDemoResults(page);
  const requested = page.getByTestId("requested-plan-section");
  await expect(requested.getByRole("button", { name: "1 hour" })).toHaveAttribute("aria-pressed", "true");
  await expect(requested.getByText("Fit shift shows an overview. Use 1 hour or 30 minutes for task details.", { exact: true })).toBeVisible();
  await showGeneratedTimeline(page);
  await expect(page.getByTestId("heat-ribbon")).toHaveAttribute("aria-label", /30.5°C.*Lower \/ caution.*46.7°C.*High risk/);
  const generated = page.getByTestId("generated-plan-section");
  await generated.getByRole("button", { name: "30 minutes" }).click();
  await expect(generated.getByRole("button", { name: "30 minutes" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.reload();
  await openDemoResults(page);
  await expect(page.getByTestId("requested-plan-section").getByRole("button", { name: "1 hour" })).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await openDemoResults(page);
  await page.getByTestId("requested-plan-section").getByRole("tab", { name: "Timeline", exact: true }).click();
  await expect(page.getByTestId("requested-plan-section").getByRole("button", { name: "Fit shift" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("schedule details translate internal reason codes into operator language", async ({ page }) => {
  await openDemoResults(page);
  await showGeneratedTimeline(page);
  await page.locator('[data-block-type="work"][data-task-id="demo-trenching"]').first().click();
  await expect(page.getByText("High TWL heavy work: 20 minutes work / 40 minutes recovery.")).toBeVisible();
  await expect(page.getByText("TWL_HIGH_HEAVY_WORK_REST")).toHaveCount(0);
});

test("no direct-sun work block overlaps 12:00–15:00", async ({ page }) => {
  await openDemoResults(page);
  const directSunBlocks = page.locator('[data-block-type="work"][data-task-id="demo-trenching"], [data-block-type="work"][data-task-id="demo-cleanup"], [data-block-type="work"][data-task-id="demo-contiguous-placement"]');
  for (let index=0; index<await directSunBlocks.count(); index+=1) {
    const block=directSunBlocks.nth(index); const start=await block.getAttribute("data-start"); const end=await block.getAttribute("data-end");
    expect(end! <= "12:00" || start! >= "15:00").toBe(true);
  }
});

test("high-risk heavy work displays a 20/40 pattern", async ({ page }) => {
  await openDemoResults(page);
  await showGeneratedTimeline(page);
  await expect(page.locator('[data-block-type="work"][data-task-id="demo-trenching"][data-start="06:30"][data-end="06:50"]')).toBeVisible();
  await expect(page.locator('[data-block-type="rest"][data-task-id="demo-trenching"][data-start="06:50"][data-end="07:30"]')).toBeVisible();
});

test("indoor work appears during midday", async ({ page }) => {
  await openDemoResults(page);
  await showGeneratedTimeline(page);
  const indoor=page.locator('[data-block-type="work"][data-task-id="demo-equipment-preparation"]');
  await expect(indoor).toBeVisible(); expect(await indoor.getAttribute("data-start")).toBe("12:00");
});

test("shows the unscheduled capacity warning", async ({ page }) => {
  await openDemoResults(page);
  await expect(page.getByText("This shift cannot accommodate all planned work under the selected conditions.")).toBeVisible();
});

test("shows the new-worker intervention warning", async ({ page }) => {
  await openDemoResults(page);
  await expect(page.getByText("Affected non-acclimatized workers need reassignment or supervisor intervention.")).toBeVisible();
});

test("recalculating after changing TWL changes the timeline", async ({ page }) => {
  await openDemoResults(page); const initialRest=await page.locator('[data-block-type="rest"]').count(); expect(initialRest).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Change conditions" }).click();
  await page.getByText("No site TWL input", { exact: true }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.getByText("Preliminary", { exact: true }).first()).toBeVisible();
  expect(await page.locator('[data-block-type="rest"]').count()).toBe(0);
});

test("print report control and printable layout are present", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDemoResults(page);
  await expect(page.getByRole("button", { name: "Print supervisor report" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Planning progress" })).toBeHidden();
  await expect(page.locator("h1")).toHaveText("Generated safer schedule");
  await page.screenshot({ path: "artifacts/ui-review/print-preview-1440x900.png", fullPage: false });
  await page.screenshot({ path: "artifacts/manual-qa/28-print-preview-english.png", fullPage: false });
});

test("Arabic mode shows the deterministic Arabic briefing", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.getByText("سياق توقعات الإحداثيات المحددة", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "عرض وردية نموذجية" }).click();
  await page.getByRole("button", { name: "متابعة إلى الظروف" }).click();
  await page.getByRole("button", { name: "إنشاء وردية أكثر أمانًا" }).click();
  await expect(page.getByTestId("requested-plan-section").getByRole("heading", { name: "الخطة الأصلية المطلوبة", exact: true })).toBeVisible();
  await expect(page.getByTestId("generated-plan-section").getByRole("heading", { name: "الجدول المُنشأ لوردية أكثر أمانًا", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "إحاطة المشرف" })).toBeVisible();
  await expect(page.getByText(/تذكير بالتصعيد في حالات الطوارئ/)).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: "artifacts/manual-qa/29-print-preview-arabic.png", fullPage: false });
});

test("start over resets the workflow", async ({ page }) => {
  await openDemoResults(page); await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: "Shift setup" })).toBeVisible();
  await expect(page.getByLabel("Site name")).toHaveValue("");
});
