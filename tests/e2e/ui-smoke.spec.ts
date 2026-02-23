import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:3000';

test.describe('UI smoke checks', () => {
  test('portfolio intake tabs are reachable and render expected workspaces', async ({ page }) => {
    await page.goto(`${baseUrl}/pas/intake`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })).toBeVisible();

    await page.getByRole('button', { name: /Create Portfolio/i }).click();
    await expect(page.getByText(/CREATE PORTFOLIO Workspace/i)).toBeVisible();

    await page.getByRole('button', { name: /Add Positions/i }).click();
    await expect(page.getByText(/ADD POSITIONS Workspace/i)).toBeVisible();

    await page.getByRole('button', { name: /Add Transactions/i }).click();
    await expect(page.getByText(/ADD TRANSACTIONS Workspace/i)).toBeVisible();

    await page.getByRole('button', { name: /Add Instruments/i }).click();
    await expect(page.getByText(/ADD INSTRUMENTS Workspace/i)).toBeVisible();

    await page.getByRole('button', { name: /Add Market Data/i }).click();
    await expect(page.getByText(/ADD MARKET DATA Workspace/i)).toBeVisible();
  });

  test('proposals simulate page renders core controls', async ({ page }) => {
    await page.goto(`${baseUrl}/proposals/simulate`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Advisory Proposals/i })).toBeVisible();
    await expect(page.getByLabel(/Portfolio ID/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Simulate Proposal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible();
  });

  test('workbench page renders shell and message', async ({ page }) => {
    await page.goto(`${baseUrl}/workbench/PF_1001`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Advisor Workbench/i })).toBeVisible();
    await expect(page.getByText(/Unable to load workbench overview|As of:/i)).toBeVisible();
  });

  test('mobile layout has no horizontal overflow on key pages', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/pas/intake', '/proposals/simulate', '/workbench/PF_1001']) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow detected on ${path}`).toBeFalsy();
    }
  });
});
