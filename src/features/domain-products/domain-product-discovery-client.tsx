"use client";

import { useMemo, useRef } from "react";
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
  getTrustAvailability,
  getTrustHeaderPresentation,
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
  const catalogueChecking = catalogQuery.isFetching || catalogQuery.fetchStatus === "paused";
  const catalogueFailure = !catalogueChecking
    ? catalogQuery.isLoadingError
      ? "initial"
      : catalogQuery.isRefetchError
        ? "refresh"
        : null
    : null;
  const catalogueFailed = catalogueFailure !== null;
  const catalogueConfirmed = Boolean(catalogQuery.data) && !catalogueChecking && !catalogueFailed;
  const trustHeader = getTrustHeaderPresentation({
    data: trustCertificationQuery.data,
    hasError: trustCertificationQuery.isError,
  });

  return (
    <DiscoveryFrame
      trustBadge={
        <SemanticBadge
          tone={catalogueConfirmed ? trustHeader.tone : catalogueFailed ? "danger" : "default"}
          emphasis="strong"
        >
          {catalogueConfirmed
            ? trustHeader.label
            : catalogueFailed
              ? "Catalogue unavailable"
              : "Checking catalogue"}
        </SemanticBadge>
      }
    >
      <CatalogueSourceContext
        catalog={catalogueConfirmed ? catalogQuery.data : undefined}
        failure={catalogueFailure}
        isChecking={catalogueChecking}
        onRefresh={() => catalogQuery.refetch()}
      />
      {catalogueChecking ? (
        <ScreenStatePanel
          kind="loading"
          title={catalogQuery.data ? "Checking the latest data product catalogue" : "Loading the data product catalogue"}
          body="Confirming the required governed product source before discovery is made available."
          rows={5}
        />
      ) : catalogueFailed || !catalogQuery.data ? (
        <ScreenStatePanel
          kind="error"
          title="The data product catalogue is temporarily unavailable"
          body="Product ownership and approved-use evidence cannot be confirmed. Cached or substitute catalogue entries have not been shown."
          hint="Choose Retry catalogue in the source context when the governed catalogue service is available."
        />
      ) : (
        <ReadyDiscovery
          catalog={catalogQuery.data}
          dependencyGraph={dependencyGraphQuery.data}
          dependencyGraphError={dependencyGraphQuery.isError}
          dependencyGraphLoading={dependencyGraphQuery.isLoading}
          dependencyGraphRefreshing={dependencyGraphQuery.isFetching}
          onRefreshDependencyGraph={() => dependencyGraphQuery.refetch()}
          trustCertification={trustCertificationQuery.data}
          trustCertificationError={trustCertificationQuery.isError}
          trustCertificationLoading={trustCertificationQuery.isLoading}
          trustCertificationRefreshing={trustCertificationQuery.isFetching}
          onRefreshTrustCertification={() => trustCertificationQuery.refetch()}
        />
      )}
    </DiscoveryFrame>
  );
}

function CatalogueSourceContext({
  catalog,
  failure,
  isChecking,
  onRefresh,
}: {
  catalog: DomainProductCatalogData | undefined;
  failure: "initial" | "refresh" | null;
  isChecking: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const refreshInFlight = useRef(false);
  const hasError = failure !== null;
  const state = isChecking ? "checking" : hasError ? "failed" : "confirmed";
  const actionLabel = isChecking
    ? "Checking catalogue"
    : hasError
      ? "Retry catalogue"
      : "Refresh catalogue";

  async function refreshOnce() {
    if (refreshInFlight.current || isChecking) return;
    refreshInFlight.current = true;
    try {
      await onRefresh();
    } finally {
      refreshInFlight.current = false;
    }
  }

  return (
    <div
      className={styles.sourceContext}
      role={hasError ? "alert" : "status"}
      aria-live={hasError ? "assertive" : "polite"}
      aria-atomic="true"
      data-state={state}
    >
      <div>
        <span>Catalogue status</span>
        <strong>
          {isChecking
            ? "Checking required source"
            : failure === "refresh"
              ? "Catalogue refresh failed"
              : failure === "initial"
                ? "Catalogue unavailable"
                : "Source confirmed"}
        </strong>
      </div>
      <div>
        <span>Published</span>
        <strong>{catalog ? formatDateTime(catalog.generatedAtUtc) : "Not confirmed"}</strong>
      </div>
      <div>
        <span>Contract</span>
        <strong>{catalog?.contractVersion ?? "Not confirmed"}</strong>
      </div>
      <span className={styles.sourceReference}>
        {catalog ? `Gateway · ${catalog.correlationId}` : "Gateway confirmation required"}
      </span>
      <ActionButton
        priority="quiet"
        className={styles.sourceAction}
        aria-disabled={isChecking}
        onClick={() => void refreshOnce()}
        aria-label={actionLabel}
      >
        {actionLabel}
      </ActionButton>
    </div>
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
  const certifiedCount = trustCertification?.trustAvailable
    ? (trustCertification.summary?.certifiedSnapshotCount ?? 0)
    : undefined;

  return (
    <>
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
    </>
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
