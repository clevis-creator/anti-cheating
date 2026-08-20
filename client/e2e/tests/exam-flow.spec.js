// Minimal example Playwright test (requires Playwright installed)
const { test, expect } = require('@playwright/test');

test('landing loads', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveTitle(/ExamAI|Exam/);
});
