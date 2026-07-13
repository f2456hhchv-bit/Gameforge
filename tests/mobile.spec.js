import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors } from './helpers.js';

test.describe('Mobile/narrow-viewport layout', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sidebar is an off-canvas drawer, topbar fits without scrolling, drawer opens/closes on nav', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Mobile Layout Test');
    await page.waitForTimeout(300);

    // Sidebar is off-screen by default on mobile.
    const sidebar = page.locator('#sidebar-aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);

    // Every remaining topbar control fits on-screen without horizontal scroll.
    for (const el of [
      page.locator('button[aria-label="Open navigation menu"]'),
      page.locator('button[aria-label="Search"]'),
      page.locator('button[title="AI Assistant"]'),
    ]) {
      const box = await el.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(390);
    }

    // Desktop-only chrome (theme/accent/help/backup/live-site link) is hidden
    // on mobile, reachable instead via the search/command-palette.
    await expect(page.locator('a[aria-label="Open live site"]')).toBeHidden();
    await page.locator('button[aria-label="Search"]').click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root input').fill('live site');
    await page.waitForTimeout(100);
    await expect(page.getByText('Open Live Site')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    // Hamburger opens the drawer.
    await page.locator('button[aria-label="Open navigation menu"]').click();
    await page.waitForTimeout(250);
    await expect(sidebar).not.toHaveClass(/-translate-x-full/);
    await expect(page.locator('#sidebar-nav .nav-item', { hasText: 'World Builder' })).toBeVisible();

    // Clicking a nav item closes the drawer and navigates.
    await page.locator('#sidebar-nav .nav-item', { hasText: 'World Builder' }).click();
    await page.waitForTimeout(300);
    await expect(sidebar).toHaveClass(/-translate-x-full/);
    await expect(page.locator('h2', { hasText: 'World Entries' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('dashboard content uses the full width, not squeezed by the sidebar', async ({ page }) => {
    await createProject(page, 'Mobile Dashboard Test', 'Fantasy Action RPG');
    await page.waitForTimeout(400);
    const statCard = page.locator('.stat-card').first();
    const box = await statCard.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
  });

  test('backdrop click closes the mobile drawer', async ({ page }) => {
    await createProject(page, 'Mobile Backdrop Test');
    await page.waitForTimeout(300);
    await page.locator('button[aria-label="Open navigation menu"]').click();
    await page.waitForTimeout(250);
    const sidebar = page.locator('#sidebar-aside');
    await expect(sidebar).not.toHaveClass(/-translate-x-full/);
    // Click outside the drawer's own width (w-64 = 256px) so the click lands
    // on the backdrop, not the higher z-index drawer sitting on top of it.
    await page.locator('#sidebar-backdrop').click({ position: { x: 350, y: 400 } });
    await page.waitForTimeout(250);
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });
});
