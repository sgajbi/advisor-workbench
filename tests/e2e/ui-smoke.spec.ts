import { test, expect } from '@playwright/test';

test.describe('UI smoke checks', () => {
  const mobileOverflowChecks = [
    {
      path: '/portfolios',
      readyName: /^Portfolio$|^Portfolio unavailable$/i,
    },
    {
      path: '/intake',
      readyName: /Portfolio Intake Operations Console/i,
    },
    {
      path: '/workbench/DEMO_ADV_USD_001',
      readyName: /^Advisor Workbench: DEMO_ADV_USD_001$/i,
    },
  ] as const;

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

  test('workbench page renders shell and message', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/workbench/DEMO_ADV_USD_001', { waitUntil: 'commit', timeout: 60000 });
    await expect(
      page.getByRole('heading', { name: /^Advisor Workbench: DEMO_ADV_USD_001$/i })
    ).toBeVisible({ timeout: 60000 });
  });

  test('mobile layout has no horizontal overflow on key pages', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const { path, readyName } of mobileOverflowChecks) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await expect(page.getByRole('heading', { name: readyName })).toBeVisible({
        timeout: 60000,
      });
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow detected on ${path}`).toBeFalsy();
    }
  });
});
