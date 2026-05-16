import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('UI smoke checks', () => {
  const mobileOverflowChecks = [
    {
      path: '/portfolios',
      assertReady: async (page: import('@playwright/test').Page) => {
        await expect(
          page.getByRole('heading', { name: /^Portfolio$|^Portfolio Summary$|^Portfolio unavailable$/i })
        ).toBeVisible({ timeout: 60000 });
      },
    },
    {
      path: '/intake',
      assertReady: async (page: import('@playwright/test').Page) => {
        await expect(
          page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })
        ).toBeVisible({ timeout: 60000 });
      },
    },
    {
      path: '/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001',
      assertReady: async (page: import('@playwright/test').Page) => {
        const unavailableHeading = page.getByRole('heading', { name: /^Portfolio unavailable$/i });
        const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
        if (unavailableVisible) {
          await expect(unavailableHeading).toBeVisible({ timeout: 60000 });
          return;
        }

        await expect(page.getByRole('tab', { name: /^Summary$/i })).toBeVisible({ timeout: 60000 });
        await expect(page.getByRole('heading', { name: /Portfolio Summary/i })).toBeVisible({
          timeout: 60000,
        });
      },
    },
  ] as const;

  test('portfolio foundation page renders core sections', async ({ page }) => {
    await page.goto('/portfolios', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /^Portfolio$|^Portfolio Summary$|^Portfolio unavailable$/i })
    ).toBeVisible();
    await expect(page.getByText(/Client Portfolios|Portfolio Summary|Portfolio unavailable/i)).toBeVisible();
  });

  test('portfolio intake tabs are reachable and render expected workspaces', async ({ page }) => {
    await page.goto('/intake', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })).toBeVisible();
    const operationTabs = page.getByRole('tablist', { name: /Intake operation/i });

    await operationTabs.getByRole('tab', { name: /^Create Portfolio$/i }).click();
    await expect(page.getByRole('heading', { name: /Create Portfolio Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Positions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Positions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Transactions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Transactions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Instruments$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Instruments Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Market Data$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Market Data Workspace/i })).toBeVisible();
  });

  test('workbench page renders shell and message', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/workbench/DEMO_ADV_USD_001', { waitUntil: 'commit', timeout: 60000 });
    await expect(
      page.getByRole('heading', { name: /^Manage Overview$|^Manage Workspace$/i })
    ).toBeVisible({ timeout: 60000 });
  });

  test('mobile layout has no horizontal overflow on key pages', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const { path, assertReady } of mobileOverflowChecks) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await assertReady(page);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow detected on ${path}`).toBeFalsy();
    }
  });
});
