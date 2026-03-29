import { test, expect } from '@playwright/test';

test.describe('UI smoke checks', () => {
  test('portfolio foundation page renders core sections', async ({ page }) => {
    await page.goto('/portfolios', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /^Portfolio$|^Portfolio unavailable$/i })
    ).toBeVisible();
    await expect(page.getByText(/Client Portfolios|Portfolio unavailable/i)).toBeVisible();
  });

  test('portfolio intake tabs are reachable and render expected workspaces', async ({ page }) => {
    await page.goto('/intake', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })).toBeVisible();
    const operationTabs = page.locator('.MuiToggleButtonGroup-root').last();

    await operationTabs.getByRole('button', { name: /^Create Portfolio$/i }).click();
    await expect(page.getByRole('heading', { name: /Create Portfolio Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Positions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Positions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Transactions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Transactions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Instruments$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Instruments Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Market Data$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Market Data Workspace/i })).toBeVisible();
  });

  test('proposals simulate page renders core controls', async ({ page }) => {
    await page.goto('/proposals/simulate', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Advisory Proposals/i })).toBeVisible();
    await expect(page.getByLabel(/Portfolio ID/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Simulate Proposal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible();
  });

  test('workbench page renders shell and message', async ({ page }) => {
    await page.goto('/workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Decision Console|Advisor Workbench/i)).toBeVisible();
  });

  test('mobile layout has no horizontal overflow on key pages', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/portfolios', '/intake', '/proposals/simulate', '/workbench']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow detected on ${path}`).toBeFalsy();
    }
  });
});
