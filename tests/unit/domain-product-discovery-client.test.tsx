import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DomainProductDiscoveryClient from "../../src/features/domain-products/domain-product-discovery-client";
import type {
  DomainProductCatalogData,
  DomainProductGraphData,
  DomainProductTrustCertificationData,
} from "../../src/features/domain-products/api";

const getDomainProductCatalogMock = vi.fn();
const getDomainProductDependencyGraphMock = vi.fn();
const getDomainProductTrustCertificationMock = vi.fn();

vi.mock("../../src/features/domain-products/api", async () => {
  const actual = await vi.importActual("../../src/features/domain-products/api");
  return {
    ...(actual as object),
    getDomainProductCatalog: () => getDomainProductCatalogMock(),
    getDomainProductDependencyGraph: () => getDomainProductDependencyGraphMock(),
    getDomainProductTrustCertification: () => getDomainProductTrustCertificationMock(),
  };
});

describe("DomainProductDiscoveryClient", () => {
  beforeEach(() => {
    getDomainProductCatalogMock.mockReset();
    getDomainProductDependencyGraphMock.mockReset();
    getDomainProductTrustCertificationMock.mockReset();
    const discovery = buildDiscovery();
    getDomainProductCatalogMock.mockResolvedValue(discovery.catalog);
    getDomainProductDependencyGraphMock.mockResolvedValue(discovery.dependencyGraph);
    getDomainProductTrustCertificationMock.mockResolvedValue(discovery.trustCertification);
  });

  it("renders the catalogue, approved use, dependency impact, and confirmed assurance", async () => {
    renderDiscovery();

    expect(screen.getByText("Loading the data product catalogue")).toBeInTheDocument();
    expect(await screen.findByText("Portfolio State Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Lotus workbench, Lotus risk")).toBeInTheDocument();
    expect(screen.getByText("Risk Metrics Report v1")).toBeInTheDocument();
    expect(screen.getByText("Fail-closed relationships")).toBeInTheDocument();
    expect(screen.getByText(/Live assurance confirmed/)).toBeInTheDocument();
    expect(screen.getByText("Available", { selector: "dd" })).toBeInTheDocument();
  });

  it("keeps the catalogue usable when the assurance source fails", async () => {
    getDomainProductTrustCertificationMock.mockRejectedValue(
      new Error("503 trust telemetry path unavailable")
    );

    renderDiscovery();

    expect(await screen.findByText("Portfolio State Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Live assurance is temporarily unavailable")).toBeInTheDocument();
    expect(screen.getAllByText("Not available").length).toBeGreaterThan(0);
    expect(screen.queryByText(/503 trust telemetry/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry assurance" })).toBeInTheDocument();
  });

  it("recovers assurance in place and preserves focus on its source control", async () => {
    const discovery = buildDiscovery();
    getDomainProductTrustCertificationMock
      .mockRejectedValueOnce(new Error("trust unavailable"))
      .mockResolvedValueOnce(discovery.trustCertification);
    renderDiscovery();

    const retry = await screen.findByRole("button", { name: "Retry assurance" });
    retry.focus();
    fireEvent.click(retry);

    expect(retry).toHaveFocus();
    await waitFor(() => {
      expect(screen.getByText(/Live assurance confirmed/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Refresh assurance" })).toHaveFocus();
    expect(screen.queryByText("Live assurance is temporarily unavailable")).not.toBeInTheDocument();
  });

  it("fences repeated assurance retries while the source request is still pending", async () => {
    const discovery = buildDiscovery();
    let resolveTrust!: (value: DomainProductTrustCertificationData) => void;
    const pendingTrust = new Promise<DomainProductTrustCertificationData>((resolve) => {
      resolveTrust = resolve;
    });
    getDomainProductTrustCertificationMock
      .mockRejectedValueOnce(new Error("trust unavailable"))
      .mockImplementationOnce(() => pendingTrust);

    renderDiscovery();

    fireEvent.click(await screen.findByRole("button", { name: "Retry assurance" }));
    const pendingControl = await screen.findByRole("button", { name: "Refresh assurance" });
    await waitFor(() => expect(pendingControl).toHaveAttribute("aria-disabled", "true"));
    fireEvent.click(pendingControl);

    expect(getDomainProductTrustCertificationMock).toHaveBeenCalledTimes(2);
    resolveTrust(discovery.trustCertification);
    await waitFor(() => {
      expect(screen.getByText(/Live assurance confirmed/)).toBeInTheDocument();
    });
    expect(getDomainProductTrustCertificationMock).toHaveBeenCalledTimes(2);
  });

  it("keeps the catalogue usable when dependency impact fails and supports recovery", async () => {
    const discovery = buildDiscovery();
    getDomainProductDependencyGraphMock
      .mockRejectedValueOnce(new Error("dependency graph unavailable"))
      .mockResolvedValueOnce(discovery.dependencyGraph);
    renderDiscovery();

    expect(await screen.findByText("Portfolio State Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Dependency impact is temporarily unavailable")).toBeInTheDocument();
    expect(screen.queryByText("dependency graph unavailable")).not.toBeInTheDocument();

    const retry = screen.getByRole("button", { name: "Retry impact evidence" });
    retry.focus();
    fireEvent.click(retry);

    await waitFor(() => {
      expect(screen.getByText("Fail-closed relationships")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Refresh impact evidence" })).toHaveFocus();
  });

  it("retains earlier assurance visibly when a refresh fails", async () => {
    const discovery = buildDiscovery();
    getDomainProductTrustCertificationMock
      .mockResolvedValueOnce(discovery.trustCertification)
      .mockRejectedValueOnce(new Error("refresh failed"));
    renderDiscovery();

    const refresh = await screen.findByRole("button", { name: "Refresh assurance" });
    fireEvent.click(refresh);

    await waitFor(() => {
      expect(
        screen.getByText("The latest assurance refresh did not complete")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Portfolio State Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Assurance refresh failed")).toBeInTheDocument();
    expect(screen.getAllByText("Earlier source evidence").length).toBeGreaterThan(0);
    expect(screen.getByText("Certified · earlier evidence")).toBeInTheDocument();
    expect(screen.getByText("Current", { selector: "dd" })).toBeInTheDocument();
    expect(screen.queryByText("refresh failed")).not.toBeInTheDocument();
  });

  it("renders source-owned unavailable assurance without inventing certification", async () => {
    const discovery = buildDiscovery();
    getDomainProductTrustCertificationMock.mockResolvedValue({
      ...discovery.trustCertification,
      trustAvailable: false,
      trustPosture: "unavailable",
      unavailableReason: "Live assurance has not yet been published for this catalogue.",
      summary: null,
      productCertifications: [],
    });

    renderDiscovery();

    expect(
      await screen.findByText("Live assurance has not been confirmed")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Live assurance has not yet been published for this catalogue.")
    ).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("0", { selector: ".workbench-summary-metric-value" })).not.toBeInTheDocument();
  });

  it("renders the empty catalogue state", async () => {
    const discovery = buildDiscovery();
    getDomainProductCatalogMock.mockResolvedValue({
      ...discovery.catalog,
      productCount: 0,
      products: [],
    });

    renderDiscovery();

    expect(await screen.findByText("No data products are available")).toBeInTheDocument();
    expect(
      screen.getByText("The governed catalogue returned no products for the Workbench.")
    ).toBeInTheDocument();
  });

  it("blocks discovery with business-safe copy when the catalogue fails", async () => {
    getDomainProductCatalogMock.mockRejectedValue(
      new Error("Domain product discovery fetch failed (503): internal path missing")
    );

    renderDiscovery();

    expect(
      await screen.findByText("The data product catalogue is temporarily unavailable")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry catalogue" })).toBeInTheDocument();
    expect(screen.queryByText(/internal path missing/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Portfolio State Snapshot")).not.toBeInTheDocument();
  });

  it("blocks cached catalogue evidence when its required-source refresh fails", async () => {
    const discovery = buildDiscovery();
    const queryClient = createQueryClient();
    queryClient.setQueryData(["domain-product-catalog"], discovery.catalog, {
      updatedAt: Date.now() - 31_000,
    });
    getDomainProductCatalogMock.mockRejectedValueOnce(new Error("catalogue refresh failed"));

    renderDiscovery(queryClient);

    expect(
      await screen.findByText("The data product catalogue is temporarily unavailable")
    ).toBeInTheDocument();
    expect(screen.getByText("Catalogue refresh failed")).toBeInTheDocument();
    expect(screen.getByText("Gateway confirmation required")).toBeInTheDocument();
    expect(screen.queryByText("Source confirmed")).not.toBeInTheDocument();
    expect(screen.queryByText("Portfolio State Snapshot")).not.toBeInTheDocument();
    expect(screen.queryByText("catalogue refresh failed", { selector: "p" })).not.toBeInTheDocument();
  });

  it("recovers cached catalogue failure in place, preserves focus, and fences repeat retry", async () => {
    const discovery = buildDiscovery();
    const queryClient = createQueryClient();
    queryClient.setQueryData(["domain-product-catalog"], discovery.catalog, {
      updatedAt: Date.now() - 31_000,
    });
    let resolveCatalog!: (value: DomainProductCatalogData) => void;
    const pendingCatalog = new Promise<DomainProductCatalogData>((resolve) => {
      resolveCatalog = resolve;
    });
    getDomainProductCatalogMock
      .mockRejectedValueOnce(new Error("catalogue refresh failed"))
      .mockImplementationOnce(() => pendingCatalog);

    renderDiscovery(queryClient);

    const retry = await screen.findByRole("button", { name: "Retry catalogue" });
    retry.focus();
    fireEvent.click(retry);

    const pendingControl = await screen.findByRole("button", { name: "Checking catalogue" });
    expect(pendingControl).toHaveFocus();
    expect(pendingControl).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(pendingControl);
    expect(getDomainProductCatalogMock).toHaveBeenCalledTimes(2);

    resolveCatalog(discovery.catalog);

    expect(await screen.findByText("Portfolio State Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Source confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh catalogue" })).toHaveFocus();
    expect(getDomainProductCatalogMock).toHaveBeenCalledTimes(2);
  });
});

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderDiscovery(queryClient = createQueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <DomainProductDiscoveryClient />
    </QueryClientProvider>
  );
}

function buildDiscovery(): {
  catalog: DomainProductCatalogData;
  dependencyGraph: DomainProductGraphData;
  trustCertification: DomainProductTrustCertificationData;
} {
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
    },
  };
}
