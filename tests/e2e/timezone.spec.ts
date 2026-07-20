import { expect, test, type Page } from "@playwright/test";

async function verifySaudiOperationalClock(page: Page) {
  await page.goto("/");
  await expect(page.getByText("All schedule times use Saudi Arabia Standard Time (Asia/Riyadh, UTC+3).", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "View sample shift" }).click();
  await expect(page.getByTestId("task-row-0")).toContainText("11:30–13:30");
  await page.getByRole("button", { name: "Continue to conditions" }).click();
  const forecast = page.getByRole("region", { name: "Hourly forecast" });
  await expect(forecast.getByRole("columnheader", { name: "06:30" })).toBeVisible();
  await expect(forecast.getByRole("columnheader", { name: "12:30" })).toBeVisible();
  await expect(page.locator(".forecast-header")).toContainText("2026-07-19 · 12:00 · Saudi Arabia Standard Time (UTC+3)");
  await page.getByRole("button", { name: "Generate safer shift" }).click();

  await expect(page.locator(".result-status-header")).toContainText("06:30–16:30");
  await expect(page.locator(".result-timezone")).toContainText("Asia/Riyadh, UTC+3");
  await expect(page.getByTestId("requested-crew-board")).toContainText("11:30–13:30");
  await expect(page.getByTestId("requested-crew-board").locator(".restriction-top-label")).toHaveText("12:00–15:00");
  await expect(page.getByTestId("generated-crew-board")).toContainText("06:30–06:50");
  await expect(page.getByTestId("generated-crew-board")).toContainText("06:50–07:30");

  await page.emulateMedia({ media: "print" });
  const printed = page.locator(".print-comparison");
  await expect(printed).toBeVisible();
  await expect(printed).toContainText("11:30–13:30");
  await expect(printed).toContainText("06:30–06:50");
  await expect(printed).toContainText("12:00–15:00");
}

for (const timezoneId of ["America/Chicago", "Asia/Riyadh"] as const) {
  test.describe(`operational clock in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test("keeps all Saudi schedule values unchanged", async ({ page }) => {
      await verifySaudiOperationalClock(page);
    });
  });
}
