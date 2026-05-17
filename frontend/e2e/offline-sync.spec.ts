import { test, expect } from "@playwright/test";

test("student offline sync end-to-end", async ({ page, context }) => {
  test.skip(
    process.env.ENABLE_DATA_DEPENDENT_E2E !== "true",
    "Set ENABLE_DATA_DEPENDENT_E2E=true to run data-dependent offline sync test.",
  );

  await page.goto("http://localhost:6031/portal/student");

  await page.getByLabel(/email/i).fill("student1001@enaes.com");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: /student login/i }).click();

  await page.waitForURL(/\/student(\/exams)?/i, { timeout: 15000 });
  await page.goto("http://localhost:6031/student/exams");

  const startButton = page.getByRole("button", { name: /start exam/i }).first();
  if ((await startButton.count()) === 0) {
    test.skip(true, "No assigned exam available for offline sync scenario.");
    return;
  }
  await startButton.click();

  await page.keyboard.press("1");
  await page.keyboard.press("6");
  await page.keyboard.press("2");

  await context.setOffline(true);
  await page.keyboard.press("6");
  await page.keyboard.press("1");

  await context.setOffline(false);
  await page.waitForTimeout(1000);

  await page.getByRole("button", { name: /submit exam/i }).click();
  await page.getByRole("button", { name: /confirm submit/i }).click();

  await expect(page.getByText("Exam Completed")).toBeVisible();
  await page.goto("/student/results");
  await expect(page.getByText(/Total Score|My Results/i)).toBeVisible();
});
