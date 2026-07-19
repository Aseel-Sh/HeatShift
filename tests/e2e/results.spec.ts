import { expect, test, type Page } from "@playwright/test";

async function openDemoResults(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Load sample shift" }).click();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.getByRole("heading", { name: "Safer shift generated" })).toBeVisible();
}

test("completes the demo scenario through results", async ({ page }) => {
  await openDemoResults(page);
  await expect(page.getByText("Site-verified TWL input", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Before: requested plan" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "After: planned timeline" })).toBeVisible();
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
  await expect(page.locator('[data-block-type="work"][data-task-id="demo-trenching"][data-start="06:30"][data-end="06:50"]')).toBeVisible();
  await expect(page.locator('[data-block-type="rest"][data-task-id="demo-trenching"][data-start="06:50"][data-end="07:30"]')).toBeVisible();
});

test("indoor work appears during midday", async ({ page }) => {
  await openDemoResults(page);
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
  await page.getByText("Forecast only", { exact: true }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.getByText("Preliminary forecast plan", { exact: true }).first()).toBeVisible();
  expect(await page.locator('[data-block-type="rest"]').count()).toBe(0);
});

test("print report control and printable layout are present", async ({ page }) => {
  await openDemoResults(page);
  await expect(page.getByRole("button", { name: "Print supervisor report" })).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Planning progress" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Safer shift generated" })).toBeVisible();
});

test("Arabic mode shows the deterministic Arabic briefing", async ({ page }) => {
  await page.goto("/"); await page.getByRole("button", { name: "العربية" }).click();
  await page.getByRole("button", { name: "تحميل وردية نموذجية" }).click();
  await page.getByRole("button", { name: "متابعة إلى الظروف" }).click();
  await page.getByRole("button", { name: "إنشاء وردية أكثر أمانًا" }).click();
  await expect(page.getByRole("heading", { name: "إحاطة المشرف" })).toBeVisible();
  await expect(page.getByText(/تذكير بالتصعيد في حالات الطوارئ/)).toBeVisible();
});

test("start over resets the workflow", async ({ page }) => {
  await openDemoResults(page); await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { name: "Describe plan" })).toBeVisible();
  await expect(page.getByLabel("Site name")).toHaveValue("");
});
