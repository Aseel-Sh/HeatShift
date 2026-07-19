import { expect, test } from "@playwright/test";

test("loads the HeatShift application shell", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Turn tomorrow's outdoor work plan into a safer shift.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Start planning" })).toBeDisabled();
  await expect(
    page.getByText(
      "Planning guidance only. Verify conditions using qualified on-site safety procedures.",
    ),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
