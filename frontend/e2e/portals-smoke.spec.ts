import { expect, test } from "@playwright/test";

test("staff portal login page is reachable", async ({ page }) => {
  await page.goto("http://localhost:6032/portal/staff");
  await expect(page.getByRole("heading", { name: /admin & examiner/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /login to staff portal/i })).toBeVisible();
});

test("student portal auth page supports registration flow", async ({ page }) => {
  await page.goto("http://localhost:6031/portal/student");

  await expect(page.getByRole("heading", { name: /student login/i })).toBeVisible();
  await page.getByRole("button", { name: /create account/i }).click();

  const unique = Date.now();
  await page.getByLabel(/first name/i).fill("E2E");
  await page.getByLabel(/last name/i).fill("Student");
  await page.getByLabel(/email/i).fill(`e2e-student-${unique}@enaes.com`);
  await page.getByLabel(/password/i).fill("demo123");

  await page.getByRole("button", { name: /create student account/i }).click();
  await page.waitForURL(/\/student/i, { timeout: 15000 });
  await expect(page).toHaveURL(/\/student/i);
});
