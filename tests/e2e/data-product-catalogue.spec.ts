import { expect, test, type Page } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import { buildPlatformCapabilitiesFixture } from "./platform-capabilities-fixture";

const catalog = {
  consumerSystem: "lotus-workbench",
  correlationId: "corr-catalog-browser",
  contractId: "lotus-domain-product-catalog",
  contractVersion: "1.0.0",
  generatedAtUtc: "2026-04-19T00:00:00Z",
  productCount: 1,
  dependencyCount: 1,
  repositoryCount: 1,
  repositories: [],
  products: [
    {
      productId: "lotus-core:PortfolioStateSnapshot:v1",
      productName: "PortfolioStateSnapshot",
      productVersion: "v1",
      producerRepository: "lotus-core",
      ownerRepository: "lotus-core",
      authoritativeDomain: "portfolio_state",
      productFamily: "simulation_and_projected_state",
      lifecycleStatus: "active",
      requiredTrustMetadata: ["as_of_date", "data_quality_status"],
      approvedConsumers: ["lotus-workbench", "lotus-risk"],
      currentRoutes: ["/integration/portfolios/{portfolio_id}/state"],
      sourcePath: "contracts/domain-data-products/lotus-core-products.v1.json",
    },
  ],
  consumers: [
    {
      consumerRepository: "lotus-risk",
      dependencyCount: 1,
      sourcePath: "contracts/domain-data-products/lotus-risk-consumers.v1.json",
      dependencies: [
        {
          dependencyId: "lotus-risk:RiskMetricsReport:v1",
          productName: "RiskMetricsReport",
          producerRepository: "lotus-risk",
          requiredProductVersion: "v1",
          requiredTrustMetadata: ["data_quality_status"],
          consumptionMode: "api_read",
          businessPurpose: "Source risk analytics input state.",
          validationLanes: ["feature", "pr-merge"],
          failurePosture: "fail_closed",
        },
      ],
    },
  ],
};

const dependencyGraph = {
  consumerSystem: "lotus-workbench",
  correlationId: "corr-graph-browser",
  contractId: "lotus-domain-product-dependency-graph",
  contractVersion: "1.0.0",
  generatedAtUtc: "2026-04-19T00:00:00Z",
  nodeCount: 2,
  edgeCount: 1,
  nodes: [],
  edges: [
    {
      edgeType: "consumes",
      from: "repo:lotus-risk",
      to: "product:lotus-core:PortfolioStateSnapshot:v1",
      consumptionMode: "api_read",
      failurePosture: "fail_closed",
      validationLanes: ["feature", "pr-merge"],
    },
  ],
};

const trustCertification = {
  consumerSystem: "lotus-workbench",
  correlationId: "corr-trust-browser",
  trustAvailable: true,
  trustPosture: "certified",
  unavailableReason: null,
  contractId: "lotus-domain-product-live-trust-certification",
  contractVersion: "1.0.0",
  governedByRfcs: ["RFC-0087"],
  generatedAtUtc: "2026-04-19T00:00:00Z",
  sourceTelemetryPath: "contracts/trust-telemetry",
  summary: {
    certificationState: "certified",
    telemetrySnapshotCount: 1,
    certifiedSnapshotCount: 1,
    attentionRequiredCount: 0,
    issueCount: 0,
  },
  productCertifications: [
    {
      productId: "lotus-core:PortfolioStateSnapshot:v1",
      producerRepository: "lotus-core",
      productName: "PortfolioStateSnapshot",
      productVersion: "v1",
      sourceRepository: "lotus-core",
      telemetryPath: "contracts/trust-telemetry/portfolio-state.telemetry.v1.json",
      emittedAtUtc: "2026-04-19T00:00:00Z",
      certificationState: "certified",
      freshnessState: "current",
      completenessStatus: "complete",
      reconciliationStatus: "reconciled",
      dataQualityStatus: "quality_passed",
      lineageMaterialized: true,
      blocked: false,
      issueCount: 0,
    },
  ],
  issues: [],
};

test("presents a dense source-confirmed catalogue across supported widths", async ({ page }) => {
  const runtime = observeBrowserRuntimeFailures(page);
  await mockDomainProductSources(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/data-products", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Data Product Catalogue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toBeVisible();
    await expect(page.getByLabel("Data product catalogue summary")).toBeVisible();
    await expect(page.getByLabel("Dependency impact summary")).toBeVisible();
    await expect(page.getByText("Gateway · corr-catalog-browser")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      )
    ).toBe(true);
  }

  runtime.assertClean();
});

test("keeps catalogue evidence visible while optional sources fail and recover", async ({ page }) => {
  const runtime = observeBrowserRuntimeFailures(page);
  await mockDomainProductSources(page, { failTrustOnce: true, failGraphOnce: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/data-products", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toBeVisible();
  await expect(page.getByText("Live assurance is temporarily unavailable")).toBeVisible();
  await expect(page.getByText("Dependency impact is temporarily unavailable")).toBeVisible();
  await expect(page.getByText(/trust telemetry path unavailable/i)).toHaveCount(0);
  await expect(page.getByText(/dependency graph path unavailable/i)).toHaveCount(0);

  const assuranceRetry = page.getByRole("button", { name: "Retry assurance" });
  await assuranceRetry.focus();
  await assuranceRetry.click();
  await expect(page.getByRole("button", { name: "Refresh assurance" })).toBeFocused();
  await expect(
    page.locator('[role="status"]').filter({ hasText: "Live assurance confirmed" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toBeVisible();

  const impactRetry = page.getByRole("button", { name: "Retry impact evidence" });
  await impactRetry.focus();
  await impactRetry.click();
  await expect(page.getByRole("button", { name: "Refresh impact evidence" })).toBeFocused();
  await expect(page.getByLabel("Dependency impact summary")).toBeVisible();
  await expect(page.getByText("Fail-closed relationships", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  const expectedSourceFailures = runtime.snapshot();
  expect(expectedSourceFailures).toHaveLength(2);
  expect(expectedSourceFailures).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: "console",
        url: expect.stringContaining("/domain-products/trust-certification"),
      }),
      expect.objectContaining({
        source: "console",
        url: expect.stringContaining("/domain-products/dependency-graph"),
      }),
    ])
  );
});

test("blocks cached catalogue evidence until its required source recovers", async ({
  page,
  context,
}) => {
  const runtime = observeBrowserRuntimeFailures(page);
  await mockDomainProductSources(page, { failCatalogRefreshOnce: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/data-products", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toBeVisible();

  const refresh = page.getByRole("button", { name: "Refresh catalogue" });
  await refresh.focus();
  await refresh.click();

  await expect(
    page.getByText("The data product catalogue is temporarily unavailable")
  ).toBeVisible();
  await expect(page.getByText("Catalogue refresh failed")).toBeVisible();
  await expect(page.getByText("Source confirmed")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toHaveCount(0);

  const retry = page.getByRole("button", { name: "Retry catalogue" });
  await expect(retry).toBeFocused();
  await retry.click();

  await expect(page.getByText("Source confirmed")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh catalogue" })).toBeFocused();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Refresh catalogue" }).click();
  await expect(page.getByText("Checking required source")).toBeVisible();
  await expect(page.getByRole("button", { name: "Checking catalogue" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Checking catalogue" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  await expect(page.getByText("Source confirmed")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toHaveCount(0);

  await context.setOffline(false);
  await expect(page.getByText("Source confirmed")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfolio State Snapshot" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh catalogue" })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  const expectedSourceFailures = runtime.snapshot();
  expect(expectedSourceFailures).toHaveLength(1);
  expect(expectedSourceFailures[0]).toEqual(
    expect.objectContaining({
      source: "console",
      url: expect.stringContaining("/domain-products/catalog"),
    })
  );
});

async function mockDomainProductSources(
  page: Page,
  options: {
    failCatalogRefreshOnce?: boolean;
    failTrustOnce?: boolean;
    failGraphOnce?: boolean;
  } = {}
) {
  let catalogRequests = 0;
  let trustRequests = 0;
  let graphRequests = 0;

  await page.route("**/api/bff/api/v1/platform/capabilities?**", async (route) => {
    await route.fulfill({ json: buildPlatformCapabilitiesFixture() });
  });
  await page.route("**/api/bff/api/v1/domain-products/catalog?**", async (route) => {
    catalogRequests += 1;
    if (options.failCatalogRefreshOnce && catalogRequests === 2) {
      await route.fulfill({ status: 503, body: "catalogue path unavailable" });
      return;
    }
    await route.fulfill({ json: { data: catalog } });
  });
  await page.route("**/api/bff/api/v1/domain-products/dependency-graph?**", async (route) => {
    graphRequests += 1;
    if (options.failGraphOnce && graphRequests === 1) {
      await route.fulfill({ status: 503, body: "dependency graph path unavailable" });
      return;
    }
    await route.fulfill({ json: { data: dependencyGraph } });
  });
  await page.route("**/api/bff/api/v1/domain-products/trust-certification?**", async (route) => {
    trustRequests += 1;
    if (options.failTrustOnce && trustRequests === 1) {
      await route.fulfill({ status: 503, body: "trust telemetry path unavailable" });
      return;
    }
    await route.fulfill({ json: { data: trustCertification } });
  });
}
