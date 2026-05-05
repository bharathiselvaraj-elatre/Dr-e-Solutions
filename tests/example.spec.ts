import { test, expect } from '@playwright/test';

test('Open Elatrus Test Form Website', async ({ page }) => {
  await page.goto('https://testform.elatrus.com/');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Verify page loaded successfully
  await expect(page).toHaveURL('https://testform.elatrus.com/');
});