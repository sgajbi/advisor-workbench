import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceRoot = process.env.ISSUE_971_EVIDENCE_DIR;
const evidenceDirectory = evidenceRoot
  ? path.resolve(evidenceRoot, "portfolio-memory")
  : null;
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "portfolio-memory") {
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

test("Portfolio Memory keeps the event decision path dense and keyboard complete", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);
  const runtime = observeBrowserRuntimeFailures(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 519, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/workbench/${portfolioId}?mode=memory`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(
      page.getByRole("heading", { name: "Historical Event Log" }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("review-context-strip")).toHaveAttribute(
      "data-source-state",
      "confirmed",
    );
    await expect(
      page.getByRole("heading", { name: "Recommended Actions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Details: Outcome Review Created" }),
    ).toBeVisible();

    const secondEvent = page.getByRole("row", { name: "Memory event 2" });
    await expect(secondEvent).toBeVisible();
    await secondEvent.focus();
    await expect(secondEvent).toBeFocused();
    await secondEvent.press("Enter");
    await expect(
      page.getByRole("heading", {
        name: "Details: Daily Readiness Check Completed",
      }),
    ).toBeVisible();

    const geometry = await page.evaluate(() => {
      const firstEvent = document.querySelector<HTMLElement>(
        '[aria-label="Portfolio memory event timeline"] tbody tr',
      );
      if (!firstEvent) {
        throw new Error("Portfolio Memory event geometry is unavailable.");
      }
      return {
        firstEventTop: firstEvent.getBoundingClientRect().top,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(
      geometry.documentWidth,
      `Portfolio Memory has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(geometry.clientWidth);
    if (viewport.width === 1440) {
      expect(geometry.firstEventTop).toBeLessThan(900);
    }

    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(
          evidenceDirectory,
          `portfolio-memory-${viewport.width}.png`,
        ),
        fullPage: true,
      });
    }
    await testInfo.attach(`portfolio-memory-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
