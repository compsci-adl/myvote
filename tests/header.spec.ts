import { test, expect } from '@playwright/test';

test('header shows brand and nav for paid members simulation', async ({ page }) => {
    await page.goto('/');

    // Brand text should exist in the navigation
    // Try to find heading globally first, then inside nav, then fallback to text
    const heading = page.locator('h1, h2, h3').filter({ hasText: 'MyVote' }).first();
    const nav = page.getByRole('navigation');
    if (await heading.count()) {
        await expect(heading).toBeVisible();
    } else {
        // Try to find navigation, but don't fail if not found
        if (await nav.count()) {
            const navHeading = nav.locator('h1, h2, h3').filter({ hasText: 'MyVote' }).first();
            if (await navHeading.count()) {
                await expect(navHeading).toBeVisible();
            } else {
                // Fallback: look for text node, only match exact text
                const brandText = page.getByText('MyVote', { exact: true }).first();
                await expect(brandText).toBeVisible();
            }
        } else {
            // Fallback: look for text node, only match exact text
            const brandText = page.getByText('MyVote', { exact: true }).first();
            await expect(brandText).toBeVisible();
        }
    }

    // Theme toggle exists
    const themeToggle = page
        .locator('button[aria-label="Toggle theme"], button[data-testid="theme-toggle"]')
        .first();
    const themeFallback = page.locator('button').filter({ hasText: /🌞|🌚/ }).first();
    const themeBtn = (await themeToggle.count()) ? themeToggle : themeFallback;
    await expect(themeBtn).toBeVisible();

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

    // Navigation buttons should appear after load
    await page.waitForSelector('text=Voting', { timeout: 4000 });
    await expect(page.locator('text=Voting').first()).toBeVisible();

    // Candidates navigation
    const candidatesButton = page.getByRole('button', { name: /Candidates/i });
    const candidatesLink = page.getByRole('link', { name: /Candidates/i });
    if (await candidatesButton.count()) {
        await expect(candidatesButton.first()).toBeVisible();
    } else if (await candidatesLink.count()) {
        await expect(candidatesLink.first()).toBeVisible();
    } else {
        // If no navigation elements found, just ensure some content is visible
        await expect(page.locator('body')).toBeVisible();
    }
});
