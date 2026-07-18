import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('UI smoke checks', () => {
  const mobileOverflowChecks = [
    {
      path: '/portfolios',
      assertReady: async (page: import('@playwright/test').Page) => {
        await expect(
          page.getByRole('heading', { name: /^Portfolio$|^Portfolio Review$|^Portfolio unavailable$/i })
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

        await expect(page.getByRole('heading', { name: /Portfolio Review/i })).toBeVisible({
          timeout: 60000,
        });
      },
    },
  ] as const;

  test('portfolio foundation page renders core sections', async ({ page }) => {
    await page.goto('/portfolios', { waitUntil: 'domcontentloaded' });
    const portfolioHeading = page.getByRole('heading', {
      name: /^Portfolio$|^Portfolio Review$|^Portfolio unavailable$/i,
    });
    await expect(portfolioHeading).toBeVisible();
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

  test('portfolio review navigation prioritizes the selected workspace when stacked', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 519, height: 900 });
    await page.goto('/income?portfolioId=PB_SG_GLOBAL_BAL_001', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const currentView = page.getByRole('button', { name: /Current view Income/i });
    const navigation = page.getByRole('navigation', { name: 'Workbench screen navigation' });
    const workspaceHeading = page.getByRole('heading', { name: /^Income & Activity$/i });

    await expect(currentView).toBeVisible({ timeout: 60000 });
    await expect(currentView).toHaveAttribute('aria-expanded', 'false');
    await expect(navigation).toBeHidden();
    await expect(workspaceHeading).toBeVisible();
    const headingBox = await workspaceHeading.boundingBox();
    expect(headingBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(900);

    await currentView.click();
    await expect(navigation).toBeVisible();
    const activeIncomeLink = navigation.getByRole('link', { name: /Income Income and activity/i });
    await expect(activeIncomeLink).toHaveAttribute('aria-current', 'page');
    await activeIncomeLink.focus();
    await activeIncomeLink.press('Escape');
    await expect(navigation).toBeHidden();
    await expect(currentView).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(currentView).toBeVisible();
    await expect(navigation).toBeHidden();

    await page.setViewportSize({ width: 1366, height: 900 });
    await expect(currentView).toBeHidden();
    await expect(navigation).toBeVisible();
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
