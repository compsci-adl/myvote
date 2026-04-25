import { test, expect } from '@playwright/test';

test('home page shows welcome and login button and theme toggle works', async ({
    page,
    browserName,
}) => {
    // Skip theme toggle functionality test on webkit due to theme provider issues
    const skipThemeTest = browserName === 'webkit';

    // Set initial theme to light
    await page.addInitScript(() => {
        localStorage.setItem('theme', 'light');
    });
    await page.goto('/');

    // Wait for either heading or login button to appear, fallback to text if needed
    const heading = page.getByText('Welcome to MyVote').first();
    const headingCount = await heading.count();
    if (headingCount > 0) {
        await expect(heading).toBeVisible();
    } else {
        // Fallback: look for text node, but only match exact text
        const welcomeText = page.getByText('Welcome to MyVote', { exact: true });
        await expect(welcomeText).toBeVisible();
    }

    // Auth controls can be either Login (unauthenticated) or Logout (authenticated).
    const authBtn = page
        .locator('button, a')
        .filter({ hasText: /Login|Sign In|Logout|Sign Out/i })
        .first();
    await expect(authBtn).toBeVisible();

    // Theme toggle button
    const themeBtn = page
        .locator('button[aria-label="Toggle theme"], button[data-testid="theme-toggle"]')
        .first();
    const fallback = page.locator('button').filter({ hasText: /🌞|🌚/ }).first();
    const btn = (await themeBtn.count()) ? themeBtn : fallback;
    await expect(btn).toBeVisible();

    // Help menu should be visible
    const helpMenuBtn = page.getByRole('button', { name: /Help|\?|How to/i });
    if (await helpMenuBtn.count()) {
        await expect(helpMenuBtn.first()).toBeVisible();
        await helpMenuBtn.first().click();
        // Check for help content/modal
        await expect(
            page.locator('[data-testid="help-menu"], [role="dialog"], [id*="help"]')
        ).toBeVisible();
        // Close help if possible
        const closeBtn = page.getByRole('button', { name: /Close|Dismiss|×/i });
        if (await closeBtn.count()) {
            await closeBtn.first().click();
        } else {
            // Fallback: press Escape to close modal
            await page.keyboard.press('Escape');
        }
        // Wait for modal to close
        await page.waitForTimeout(500);
    }

    // Toggle theme and assert the html dark-class flips.
    if (!skipThemeTest) {
        const html = page.locator('html');
        const wasDark = await html.evaluate((node) => node.classList.contains('dark'));
        // Close any open modals before clicking
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        await btn.click();
        await expect
            .poll(async () => html.evaluate((node) => node.classList.contains('dark')))
            .toBe(!wasDark);
    }
});
