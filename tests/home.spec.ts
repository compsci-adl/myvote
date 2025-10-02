import { test, expect } from '@playwright/test';

test('home page shows welcome and login button and theme toggle works', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Welcome to MyVote/ })
  ).toHaveText(/Welcome to MyVote/);

  // Login button should be visible for unauthenticated users
  const loginBtn = page.getByRole('button', { name: /Login/i });
  await expect(loginBtn).toBeVisible();

  // Find the theme toggle button
  const themeBtn = page.locator('button[aria-label="Toggle theme"], button[data-testid="theme-toggle"]').first();
  // Fallback: any button that contains the sun/moon emoji
  const fallback = page.locator('button').filter({ hasText: /🌞|🌚/ }).first();
  const btn = (await themeBtn.count()) ? themeBtn : fallback;
  await expect(btn).toBeVisible();

  // Read current theme marker and click the toggle, then assert it changed
  const getThemeMarker = async () => {
    const html = await page.locator('html').first();
    const dataTheme = await html.getAttribute('data-theme');
    const className = await html.getAttribute('class');
    return { dataTheme, className };
  };

  const before = await getThemeMarker();
  await btn.click();
  await page.waitForTimeout(150);
  const after = await getThemeMarker();
  // At least one of the theme indicators should change
  expect(after.dataTheme !== before.dataTheme || after.className !== before.className).toBe(true);
});
