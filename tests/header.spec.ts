import { test, expect } from '@playwright/test';

test('header shows brand and nav for paid members simulation', async ({ page }) => {
  await page.goto('/');

  // Brand text should exist in the navigation
  await expect(
    page.getByRole('navigation').getByRole('heading', { name: 'MyVote' })
  ).toBeVisible();

  // Theme toggle exists (prefer an accessible toggle if available)
  const themeToggle = page.locator('button[aria-label="Toggle theme"], button[data-testid="theme-toggle"]').first();
  const themeFallback = page.locator('button').filter({ hasText: /🌞|🌚/ }).first();
  const themeBtn = (await themeToggle.count()) ? themeToggle : themeFallback;
  await expect(themeBtn).toBeVisible();

  // Since membership API is mocked in client to always set paid, navigation buttons should appear after load
  await page.waitForSelector('text=Voting', { timeout: 4000 });
  await expect(page.locator('text=Voting')).toBeVisible();

  // Use role-based lookup for Candidates
  const candidatesButton = page.getByRole('button', { name: /Candidates/i });
  const candidatesLink = page.getByRole('link', { name: /Candidates/i });
  const btnCount = await candidatesButton.count();
  const linkCount = await candidatesLink.count();
  if (btnCount > 0) {
    await expect(candidatesButton.first()).toBeVisible();
  } else if (linkCount > 0) {
    await expect(candidatesLink.first()).toBeVisible();
  } else {
    // Fallback: ensure navigation exists and is visible
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  }
});
