import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const secondaryPortfolioId = "PB_SG_INCOME_001";
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "mandate-health") {
    return;
  }
  const port = Number(process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "manage"
  ) {
    throw new Error(
      `Manage fixture proof requires the owned gateway at ${expectedGateway}.`,
    );
  }
  fixtureGateway = await startManageFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("Mandate Health preserves source truth across partial and complete attention views", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);
  const runtime = observeBrowserRuntimeFailures(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 720, height: 900 },
    { width: 390, height: 844 },
  ]) {
    fixtureGateway?.setMandateHealthExceptionMode("windows");
    fixtureGateway?.setMandateHealthPortfolioScope(portfolioId);
    await page.setViewportSize(viewport);
    await page.goto(`/workbench/${portfolioId}?mode=mandate`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(
      page.getByRole("heading", { name: "Mandate review workflow" }),
    ).toBeVisible({ timeout: 60_000 });

    const queue = page
      .getByLabel("Mandate attention items")
      .locator("xpath=ancestor::section[1]");
    await expect(queue).toHaveAttribute("data-source-window", "1");
    await expect(queue).toHaveAttribute("data-source-posture", "partial");
    await expect(queue).toHaveAttribute(
      "data-source-correlation-id",
      "corr-manage-exceptions-window-1",
    );
    await expect(queue.getByText("2 in this view")).toBeVisible();
    await expect(
      queue.getByText("More attention items are available"),
    ).toBeVisible();
    await expect(
      queue.getByRole("button", { name: "Benchmark mapping requires review" }),
    ).toBeVisible();
    await expect(queue.getByText("No open items")).toHaveCount(0);
    await testInfo.attach(`mandate-health-partial-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    if (viewport.width === 1440) {
      fixtureGateway?.setMandateHealthExceptionMode("delayed-next");
      const delayedRequest = page.waitForRequest((request) =>
        request.url().includes("cursor=mandate-attention-window-2"),
      );
      await page.getByRole("button", { name: "Next attention items" }).click();
      await delayedRequest;
      fixtureGateway?.setMandateHealthPortfolioScope(secondaryPortfolioId);
      await page.goto(`/workbench/${secondaryPortfolioId}?mode=mandate`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      const secondaryQueue = page
        .getByLabel("Mandate attention items")
        .locator("xpath=ancestor::section[1]");
      await expect(
        secondaryQueue.getByRole("button", {
          name: "Income distribution threshold requires review",
        }),
      ).toBeVisible();
      await expect(secondaryQueue).toHaveAttribute(
        "data-source-correlation-id",
        "corr-manage-exceptions-secondary",
      );
      await page.waitForTimeout(900);
      await expect(secondaryQueue).toHaveAttribute(
        "data-source-correlation-id",
        "corr-manage-exceptions-secondary",
      );
      await expect(
        page.getByText("Concentration threshold requires review"),
      ).toHaveCount(0);

      fixtureGateway?.setMandateHealthExceptionMode("windows");
      fixtureGateway?.setMandateHealthPortfolioScope(portfolioId);
      await page.goto(`/workbench/${portfolioId}?mode=mandate`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
    }

    const next = page.getByRole("button", { name: "Next attention items" });
    await next.focus();
    await expect(next).toBeFocused();
    await next.click();

    await expect(
      page.getByRole("button", {
        name: "Concentration threshold requires review",
      }),
    ).toBeVisible();
    await expect(queue).toHaveAttribute("data-source-window", "2");
    await expect(queue).toHaveAttribute("data-source-posture", "complete");
    await expect(queue).toHaveAttribute(
      "data-source-correlation-id",
      "corr-manage-exceptions-window-2",
    );
    await expect(page.getByText("Attention-item source view 2")).toBeVisible();
    await expect(page.getByText("1 open")).toBeVisible();
    const previous = page.getByRole("button", {
      name: "Previous attention items",
    });
    await expect(previous).toBeEnabled();
    await expect(previous).toBeFocused();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      overflow.documentWidth,
      `Mandate Health has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(overflow.clientWidth);
    await testInfo.attach(`mandate-health-complete-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    fixtureGateway?.setMandateHealthExceptionMode("empty");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("No open attention items")).toBeVisible();
    await expect(page.getByText("No open items")).toBeVisible();
    await expect(page.getByText("Evidence unavailable")).toHaveCount(0);
    await testInfo.attach(`mandate-health-empty-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });

    fixtureGateway?.setMandateHealthExceptionMode("unavailable");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("Attention items are temporarily unavailable"),
    ).toBeVisible();
    await expect(
      page.getByText("Evidence unavailable", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("No open items")).toHaveCount(0);

    await testInfo.attach(`mandate-health-unavailable-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }

  fixtureGateway?.setMandateHealthExceptionMode("windows");

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
