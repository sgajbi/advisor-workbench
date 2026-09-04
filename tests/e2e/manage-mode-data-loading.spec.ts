import { expect, test, type Page } from "@playwright/test";

import {
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "mode-loading") {
    return;
  }
  const port = Number(process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "manage"
  ) {
    throw new Error(
      `Manage mode-loading proof requires the owned gateway at ${expectedGateway}.`,
    );
  }
  fixtureGateway = await startManageFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("Manage mode navigation requests only the selected workflow evidence", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);

  fixtureGateway?.resetRequestPaths();
  const overviewStartedAt = Date.now();
  await page.goto(`/workbench/${portfolioId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await expect(
    page.getByRole("heading", { name: "Portfolio management decisions" }),
  ).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
  const overview = modeEvidence("Overview", overviewStartedAt);

  const rebalance = await navigateToMode(page, "Rebalance", "Rebalance Waves");
  const quality = await navigateToMode(page, "PM Quality", "PM Operating Quality");

  expect(overview.paths).toHaveLength(5);
  expect(overview.paths).toContain("/api/v1/dpm/command-center/waves");
  expect(overview.paths.some((path) => path.includes("pm-operating-quality"))).toBe(false);
  expect(overview.paths.some((path) => path.includes("campaign-"))).toBe(false);

  // Rebalance adds eight selected-campaign client reads after the 18-call server
  // composition: lifecycle, launch history, readiness, launch package, and four
  // governance-evidence reads. They belong to the rendered workflow; #791 owns
  // their state convergence.
  expect(rebalance.paths).toHaveLength(26);
  expect(rebalance.paths).toContain(
    "/api/v1/dpm/command-center/waves/campaign-definitions",
  );
  expect(rebalance.paths.some((path) => path.includes("pm-operating-quality"))).toBe(false);
  expect(rebalance.paths.some((path) => path.includes("portfolio-memory"))).toBe(false);

  // The fixture has no fairness, review-action, or summary-invocation detail
  // rows, so PM Quality correctly stops after its five list reads.
  expect(quality.paths).toHaveLength(9);
  expect(quality.paths).toContain(
    "/api/v1/dpm/command-center/pm-operating-quality/policies",
  );
  expect(quality.paths).not.toContain("/api/v1/dpm/command-center/waves");
  expect(quality.paths.some((path) => path.includes("campaign-"))).toBe(false);

  await testInfo.attach("manage-mode-loading-evidence.json", {
    body: Buffer.from(
      JSON.stringify(
        {
          baseline: {
            serverCompositionCallsPerMode: 25,
            threeModeServerCompositionCalls: 75,
            rebalanceClientWorkflowCalls: 8,
            threeModeObservedCalls: 83,
            maximumServerCompositionCallsWithAllDetailRows: 28,
          },
          measured: {
            calls: overview.paths.length + rebalance.paths.length + quality.paths.length,
            modes: [overview, rebalance, quality],
          },
        },
        null,
        2,
      ),
    ),
    contentType: "application/json",
  });
});

async function navigateToMode(page: Page, label: string, heading: string) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
  fixtureGateway?.resetRequestPaths();
  await page.getByRole("button", { name: "Change workflow step" }).click();
  const destination = page.getByRole("link", { name: label, exact: true });
  await expect(destination).toBeVisible();
  await page.waitForTimeout(250);
  expect(dpmRequestPaths()).toEqual([]);

  const startedAt = Date.now();
  await destination.click();
  await expect(page.getByRole("heading", { level: 1, name: heading, exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
  return modeEvidence(label, startedAt);
}

function modeEvidence(mode: string, startedAt: number) {
  return {
    mode,
    durationMs: Date.now() - startedAt,
    paths: dpmRequestPaths(),
  };
}

function dpmRequestPaths() {
  return (fixtureGateway?.getRequestPaths() ?? []).filter((path) =>
    path.startsWith("/api/v1/dpm/"),
  );
}
