"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  ActionButton,
  ScreenStatePanel,
  SemanticBadge,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import {
  type DomainProductCatalogData,
  type DomainProductGraphData,
  type DomainProductTrustCertificationData,
  getDomainProductCatalog,
  getDomainProductDependencyGraph,
  getDomainProductTrustCertification,
} from "./api";
import {
  ApprovedUseSection,
  ProductCatalogueSection,
} from "./domain-product-catalogue-sections";
import styles from "./domain-product-discovery.module.css";
import {
  DependencyGraphSection,
  TrustSection,
} from "./domain-product-source-sections";
import {
  formatDateTime,
  formatStateLabel,
  getTrustAvailability,
  getTrustTone,
} from "./presentation";

export default function DomainProductDiscoveryClient() {
  const catalogQuery = useQuery({
    queryKey: ["domain-product-catalog"],
    queryFn: getDomainProductCatalog,
    ...workbenchStrictQueryDefaults,
  });
  const dependencyGraphQuery = useQuery({
    queryKey: ["domain-product-dependency-graph"],
    queryFn: getDomainProductDependencyGraph,
    ...workbenchStrictQueryDefaults,
  });
  const trustCertificationQuery = useQuery({
    queryKey: ["domain-product-trust-certification"],
    queryFn: getDomainProductTrustCertification,
    ...workbenchStrictQueryDefaults,
  });

  if (catalogQuery.isLoading && !catalogQuery.data) {
    return (
      <DiscoveryFrame trustBadge={<SemanticBadge>Checking assurance</SemanticBadge>}>
        <ScreenStatePanel
          kind="loading"
          title="Loading the data product catalogue"
          body="Confirming the governed products available to the Workbench."
          rows={5}
        />
      </DiscoveryFrame>
    );
  }

  if (catalogQuery.error && !catalogQuery.data) {
    return (
      <DiscoveryFrame trustBadge={<SemanticBadge tone="danger">Catalogue unavailable</SemanticBadge>}>
        <ScreenStatePanel
          kind="error"
          title="The data product catalogue is temporarily unavailable"
          body="Product ownership and approved-use evidence cannot be confirmed. No substitute catalogue has been shown."
          hint="Retry when the governed catalogue service is available."
          action={
            <ActionButton onClick={() => void catalogQuery.refetch()}>
              Retry catalogue
            </ActionButton>
          }
        />
      </DiscoveryFrame>
    );
  }

  if (!catalogQuery.data) return null;

  return (
    <ReadyDiscovery
      catalog={catalogQuery.data}
      dependencyGraph={dependencyGraphQuery.data}
      dependencyGraphError={Boolean(dependencyGraphQuery.error)}
      dependencyGraphLoading={dependencyGraphQuery.isLoading}
      dependencyGraphRefreshing={dependencyGraphQuery.isFetching}
      onRefreshDependencyGraph={() => dependencyGraphQuery.refetch()}
      trustCertification={trustCertificationQuery.data}
      trustCertificationError={Boolean(trustCertificationQuery.error)}
      trustCertificationLoading={trustCertificationQuery.isLoading}
      trustCertificationRefreshing={trustCertificationQuery.isFetching}
      onRefreshTrustCertification={() => trustCertificationQuery.refetch()}
    />
  );
}

function ReadyDiscovery({
  catalog,
  dependencyGraph,
  dependencyGraphError,
  dependencyGraphLoading,
  dependencyGraphRefreshing,
  onRefreshDependencyGraph,
  trustCertification,
  trustCertificationError,
  trustCertificationLoading,
  trustCertificationRefreshing,
  onRefreshTrustCertification,
}: {
  catalog: DomainProductCatalogData;
  dependencyGraph: DomainProductGraphData | undefined;
  dependencyGraphError: boolean;
  dependencyGraphLoading: boolean;
  dependencyGraphRefreshing: boolean;
  onRefreshDependencyGraph: () => Promise<unknown>;
  trustCertification: DomainProductTrustCertificationData | undefined;
  trustCertificationError: boolean;
  trustCertificationLoading: boolean;
  trustCertificationRefreshing: boolean;
  onRefreshTrustCertification: () => Promise<unknown>;
}) {
  const trustByProductId = useMemo(
    () =>
      new Map(
        trustCertification?.productCertifications.map((certification) => [
          certification.productId,
          certification,
        ]) ?? []
      ),
    [trustCertification?.productCertifications]
  );
  const trustAvailability = getTrustAvailability({
    data: trustCertification,
    loading: trustCertificationLoading,
    hasError: trustCertificationError,
  });
  const hasRetainedTrust = Boolean(trustCertification && trustCertificationError);
  const trustTone = hasRetainedTrust
    ? "warn"
    : trustCertification
      ? getTrustTone(trustCertification.trustPosture)
      : trustCertificationError
        ? "warn"
        : "default";
  const trustLabel = hasRetainedTrust
    ? "Assurance refresh failed"
    : trustCertification
      ? formatStateLabel(trustCertification.trustPosture)
      : trustCertificationError
        ? "Assurance unavailable"
        : "Checking assurance";
  const certifiedCount = trustCertification?.trustAvailable
    ? (trustCertification.summary?.certifiedSnapshotCount ?? 0)
    : undefined;

  return (
    <DiscoveryFrame
      trustBadge={
        <SemanticBadge tone={trustTone} emphasis="strong">
          {trustLabel}
        </SemanticBadge>
      }
    >
      <div className={styles.sourceContext} aria-label="Catalogue source context">
        <div>
          <span>Catalogue status</span>
          <strong>Source confirmed</strong>
        </div>
        <div>
          <span>Published</span>
          <strong>{formatDateTime(catalog.generatedAtUtc)}</strong>
        </div>
        <div>
          <span>Contract</span>
          <strong>{catalog.contractVersion}</strong>
        </div>
        <span className={styles.sourceReference}>Gateway · {catalog.correlationId}</span>
      </div>

      <WorkbenchSummaryMetricStrip
        ariaLabel="Data product catalogue summary"
        items={[
          {
            key: "products",
            label: "Available products",
            value: catalog.productCount,
            support: "Governed product contracts",
          },
          {
            key: "consumers",
            label: "Approved consumers",
            value: catalog.consumers.length,
            support: "Declared consuming systems",
          },
          {
            key: "dependencies",
            label: "Dependencies",
            value: catalog.dependencyCount,
            support: "Declared source relationships",
          },
          {
            key: "certified",
            label: "Assurance confirmed",
            value: certifiedCount ?? "—",
            support: hasRetainedTrust
              ? "Earlier source evidence"
              : certifiedCount === undefined
                ? "Live assurance unavailable"
                : "Current certifications",
            unavailable: certifiedCount === undefined,
          },
        ]}
      />

      <ProductCatalogueSection
        products={catalog.products}
        trustByProductId={trustByProductId}
        trustAvailability={trustAvailability}
      />
      <TrustSection
        data={trustCertification}
        hasError={trustCertificationError}
        isLoading={trustCertificationLoading}
        isRefreshing={trustCertificationRefreshing}
        onRefresh={onRefreshTrustCertification}
      />
      <ApprovedUseSection consumers={catalog.consumers} />
      <DependencyGraphSection
        data={dependencyGraph}
        hasError={dependencyGraphError}
        isLoading={dependencyGraphLoading}
        isRefreshing={dependencyGraphRefreshing}
        onRefresh={onRefreshDependencyGraph}
      />
    </DiscoveryFrame>
  );
}

function DiscoveryFrame({
  trustBadge,
  children,
}: {
  trustBadge: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      <WorkbenchPageFrame
        title="Data Product Catalogue"
        subtitle="Find governed data products, confirm accountable ownership and assess whether the evidence is fit for use."
        actions={
          <>
            {trustBadge}
            <SemanticBadge>Gateway sourced</SemanticBadge>
          </>
        }
      >
        <WorkbenchSectionStack>{children}</WorkbenchSectionStack>
      </WorkbenchPageFrame>
    </main>
  );
}
