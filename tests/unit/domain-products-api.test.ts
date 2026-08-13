import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDomainProductCatalog,
  getDomainProductDependencyGraph,
  getDomainProductTrustCertification,
} from "../../src/features/domain-products/api";
import {
  getAnalyticsUiMetricEvents,
  resetAnalyticsUiMetricEvents,
} from "../../src/features/analytics-observability/metrics";

describe("domain product discovery api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAnalyticsUiMetricEvents();
  });

  it("loads catalog, dependency graph, and trust certification through the gateway BFF", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/domain-products/catalog?")) {
        return jsonResponse({
          data: {
            consumerSystem: "lotus-workbench",
            correlationId: "corr-catalog",
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
                approvedConsumers: ["lotus-workbench"],
                currentRoutes: ["/integration/portfolios/{portfolio_id}/state"],
                sourcePath: "contracts/domain-data-products/lotus-core-products.v1.json",
              },
            ],
            consumers: [],
          },
        });
      }
      if (url.includes("/domain-products/dependency-graph?")) {
        return jsonResponse({
          data: {
            consumerSystem: "lotus-workbench",
            correlationId: "corr-graph",
            contractId: "lotus-domain-product-dependency-graph",
            contractVersion: "1.0.0",
            generatedAtUtc: "2026-04-19T00:00:00Z",
            nodeCount: 1,
            edgeCount: 0,
            nodes: [],
            edges: [],
          },
        });
      }
      if (url.includes("/domain-products/trust-certification?")) {
        return jsonResponse({
          data: {
            consumerSystem: "lotus-workbench",
            correlationId: "corr-trust",
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
            productCertifications: [],
            issues: [],
          },
        });
      }
      return new Response("not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const [catalog, dependencyGraph, trustCertification] = await Promise.all([
      getDomainProductCatalog(),
      getDomainProductDependencyGraph(),
      getDomainProductTrustCertification(),
    ]);

    expect(catalog.products[0].producerRepository).toBe("lotus-core");
    expect(dependencyGraph.contractId).toBe("lotus-domain-product-dependency-graph");
    expect(trustCertification.trustPosture).toBe("certified");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/domain-products/catalog?consumerSystem=lotus-workbench",
      { cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/domain-products/dependency-graph?consumerSystem=lotus-workbench",
      { cache: "no-store" }
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/domain-products/trust-certification?consumerSystem=lotus-workbench",
      { cache: "no-store" }
    );

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("domain-product-catalog");
    expect(metricEventsJson).toContain("domain-product-dependency-graph");
    expect(metricEventsJson).toContain("domain-product-trust-certification");
    expect(metricEventsJson).toContain('"supportability_state":"unknown"');
    expect(metricEventsJson).not.toContain("lotus-core:PortfolioStateSnapshot:v1");
    expect(metricEventsJson).not.toContain("corr-catalog");
    expect(metricEventsJson).not.toContain("corr-graph");
    expect(metricEventsJson).not.toContain("corr-trust");
    expect(metricEventsJson).not.toContain("contracts/domain-data-products");
    expect(metricEventsJson).not.toContain("/integration/portfolios");
  });

  it("fails when gateway discovery returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("catalog missing", { status: 503 }))
    );

    await expect(getDomainProductCatalog()).rejects.toThrow(
      "Domain product discovery fetch failed (503): catalog missing"
    );

    const metricEventsJson = JSON.stringify(getAnalyticsUiMetricEvents());
    expect(metricEventsJson).toContain("domain-product-catalog");
    expect(metricEventsJson).toContain('"status_class":"5xx"');
    expect(metricEventsJson).not.toContain("catalog missing");
  });
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
