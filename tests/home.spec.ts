import { test, expect } from '@playwright/test';

test('home page shows welcome and login button and theme toggle works', async ({ page }) => {
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

    // Login button should be visible for unauthenticated users
    let loginBtn = page.getByRole('button', { name: /Login|Sign In/i });
    if (!(await loginBtn.count())) {
        loginBtn = page.getByRole('link', { name: /Login|Sign In/i });
    }
    if (!(await loginBtn.count())) {
        // Fallback: any element with login text
        loginBtn = page
            .locator('button, a')
            .filter({ hasText: /Login|Sign In/i })
            .first();
    }
    await expect(loginBtn).toBeVisible();

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

    // Read current theme marker and click the toggle, then assert it changed
    const getThemeMarker = async () => {
        const html = await page.locator('html').first();
        const dataTheme = await html.getAttribute('data-theme');
        const className = await html.getAttribute('class');
        return { dataTheme, className };
    };

    const before = await getThemeMarker();
    // Close any open modals before clicking
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await btn.click({ force: true });
    await page.waitForTimeout(150);
    const after = await getThemeMarker();
    // At least one of the theme indicators should change
    expect(after.dataTheme !== before.dataTheme || after.className !== before.className).toBe(true);
});
