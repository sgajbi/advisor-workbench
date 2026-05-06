import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DomainProductDiscoveryClient from "../../src/features/domain-products/domain-product-discovery-client";
import type { DomainProductDiscoveryData } from "../../src/features/domain-products/api";

const getDomainProductDiscoveryMock = vi.fn();

vi.mock("../../src/features/domain-products/api", async () => {
  const actual = await vi.importActual("../../src/features/domain-products/api");
  return {
    ...(actual as object),
    getDomainProductDiscovery: () => getDomainProductDiscoveryMock(),
  };
});

describe("DomainProductDiscoveryClient", () => {
  beforeEach(() => {
    getDomainProductDiscoveryMock.mockReset();
  });

  it("renders real catalog, dependency, and certified trust facts", async () => {
    getDomainProductDiscoveryMock.mockResolvedValue(buildDiscovery());

    render(<DomainProductDiscoveryClient />);

    expect(
      screen.getByText("Loading governed catalog and trust certification from gateway.")
    ).toBeInTheDocument();

    expect(await screen.findByText("PortfolioStateSnapshot")).toBeInTheDocument();
    expect(screen.getAllByText("lotus-core").length).toBeGreaterThan(0);
    expect(screen.getByText("lotus-workbench, lotus-risk")).toBeInTheDocument();
    expect(screen.getByText("materialized")).toBeInTheDocument();
    expect(screen.getByText("RiskMetricsReport v1")).toBeInTheDocument();
    expect(screen.getByText("Fail-closed edges")).toBeInTheDocument();
  });

  it("renders unavailable trust without inventing certification", async () => {
    getDomainProductDiscoveryMock.mockResolvedValue(
      buildDiscovery({
        trustAvailable: false,
        trustPosture: "unavailable",
        unavailableReason: "Platform live trust certification artifact is unavailable.",
        summary: null,
        productCertifications: [],
      })
    );

    render(<DomainProductDiscoveryClient />);

    await waitFor(() => {
      expect(screen.getByText("Trust Attention")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Platform live trust certification artifact is unavailable.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("unavailable").length).toBeGreaterThan(0);
  });

  it("renders stale trust issue details as partial truth", async () => {
    getDomainProductDiscoveryMock.mockResolvedValue(
      buildDiscovery({
        trustPosture: "attention_required",
        summary: {
          certificationState: "attention_required",
          telemetrySnapshotCount: 1,
          certifiedSnapshotCount: 0,
          attentionRequiredCount: 1,
          issueCount: 1,
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
            certificationState: "attention_required",
            freshnessState: "stale",
            completenessStatus: "complete",
            reconciliationStatus: "reconciled",
            dataQualityStatus: "quality_passed",
            lineageMaterialized: true,
            blocked: false,
            issueCount: 1,
          },
        ],
        issues: [
          {
            code: "freshness_not_current",
            severity: "warning",
            productId: "lotus-core:PortfolioStateSnapshot:v1",
            detail: "Freshness state is stale.",
          },
        ],
      })
    );

    render(<DomainProductDiscoveryClient />);

    await waitFor(() => {
      expect(screen.getByText("freshness_not_current")).toBeInTheDocument();
    });

    expect(screen.getByText("Freshness state is stale.")).toBeInTheDocument();
    expect(screen.getAllByText("attention required").length).toBeGreaterThan(0);
  });

  it("renders the empty catalog state", async () => {
    const discovery = buildDiscovery();
    getDomainProductDiscoveryMock.mockResolvedValue({
      ...discovery,
      catalog: {
        ...discovery.catalog,
        productCount: 0,
        products: [],
      },
    });

    render(<DomainProductDiscoveryClient />);

    await waitFor(() => {
      expect(screen.getByText("No Governed Products")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Gateway returned an empty domain-product catalog for lotus-workbench.")
    ).toBeInTheDocument();
  });

  it("renders gateway errors truthfully", async () => {
    getDomainProductDiscoveryMock.mockRejectedValue(new Error("gateway unavailable"));

    render(<DomainProductDiscoveryClient />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("gateway unavailable");
    });
  });
});

function buildDiscovery(
  trustOverrides: Partial<DomainProductDiscoveryData["trustCertification"]> = {}
): DomainProductDiscoveryData {
  return {
    catalog: {
      consumerSystem: "lotus-workbench",
      correlationId: "corr-catalog",
      contractId: "lotus-domain-product-catalog",
      contractVersion: "1.0.0",
      generatedAtUtc: "2026-04-19T00:00:00Z",
      productCount: 1,
      dependencyCount: 1,
      repositoryCount: 1,
      repositories: [
        {
          repository: "lotus-core",
          producedProductCount: 1,
          consumedDependencyCount: 0,
        },
      ],
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
    },
    dependencyGraph: {
      consumerSystem: "lotus-workbench",
      correlationId: "corr-graph",
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
    },
    trustCertification: {
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
      ...trustOverrides,
    },
  };
}
