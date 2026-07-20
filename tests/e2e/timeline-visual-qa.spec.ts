import { expect, test, type Page } from "@playwright/test";

const root = "artifacts/final-timeline-polish";

async function openDemoResults(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "View sample shift" }).click();
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  await page.getByRole("button", { name: "Generate safer shift" }).click();
  await expect(page.getByRole("heading", { name: "Selected safer schedule", exact: true })).toBeVisible();
}

test("captures the requested-versus-safer timeline at required viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDemoResults(page);
  await page.screenshot({ path: `${root}/desktop-1440x900.png` });
  await page.locator('[data-requested-id="demo-trenching"]').click();

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: `${root}/tablet-768x1024.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await openDemoResults(page);
  await page.screenshot({ path: `${root}/mobile-390x844.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("captures Arabic chronology and print output", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "العربية" }).click();
  await page.getByRole("button", { name: "عرض وردية نموذجية" }).click();
  await page.getByRole("button", { name: "متابعة إلى الظروف" }).click();
  await page.getByRole("button", { name: "إنشاء وردية أكثر أمانًا" }).click();
  await expect(page.locator(".requested-row-label").getByText("حفر خندق ثقيل", { exact: true })).toBeVisible();
  await page.locator(".timeline-section").screenshot({ path: `${root}/arabic-result.png` });
  await expect(page.getByTestId("shift-board")).toHaveAttribute("dir", "ltr");

  await page.emulateMedia({ media: "print" });
  await page.screenshot({ path: `${root}/print-output.png`, fullPage: true });
});
