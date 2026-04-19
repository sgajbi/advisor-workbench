"use client";

import { useEffect, useMemo, useState } from "react";

import {
  SectionBlock,
  SemanticBadge,
  Text,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import {
  DomainProduct,
  DomainProductDiscoveryData,
  DomainProductTrustCertification,
  getDomainProductDiscovery,
} from "./api";

type DiscoveryState =
  | { kind: "loading" }
  | { kind: "ready"; data: DomainProductDiscoveryData }
  | { kind: "error"; message: string };

type TrustTone = "success" | "warn" | "danger" | "default";

export default function DomainProductDiscoveryClient() {
  const [state, setState] = useState<DiscoveryState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    getDomainProductDiscovery()
      .then((data) => {
        if (!cancelled) {
          setState({ kind: "ready", data });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "Domain product discovery failed.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <DiscoveryFrame trustBadge={<SemanticBadge>Loading</SemanticBadge>}>
        <SectionBlock title="Loading Domain Products">
          <div className="domain-products-loading" role="status">
            Loading governed catalog and trust certification from gateway.
          </div>
        </SectionBlock>
      </DiscoveryFrame>
    );
  }

  if (state.kind === "error") {
    return (
      <DiscoveryFrame trustBadge={<SemanticBadge tone="danger">Unavailable</SemanticBadge>}>
        <SectionBlock title="Discovery Unavailable">
          <div className="domain-products-state domain-products-state-danger" role="alert">
            {state.message}
          </div>
        </SectionBlock>
      </DiscoveryFrame>
    );
  }

  return <ReadyDiscovery data={state.data} />;
}

function ReadyDiscovery({ data }: { data: DomainProductDiscoveryData }) {
  const trustByProductId = useMemo(() => {
    return new Map(
      data.trustCertification.productCertifications.map((certification) => [
        certification.productId,
        certification,
      ])
    );
  }, [data.trustCertification.productCertifications]);

  const trustTone = getTrustTone(data.trustCertification.trustPosture);
  const products = data.catalog.products;
  const hasProducts = products.length > 0;
  const hasPartialTrust =
    !data.trustCertification.trustAvailable ||
    data.trustCertification.trustPosture !== "certified" ||
    data.trustCertification.productCertifications.some(
      (certification) =>
        certification.certificationState !== "certified" ||
        certification.freshnessState === "stale" ||
        certification.blocked === true
    );

  return (
    <DiscoveryFrame
      trustBadge={
        <SemanticBadge tone={trustTone} emphasis="strong">
          {formatStateLabel(data.trustCertification.trustPosture)}
        </SemanticBadge>
      }
    >
      {!hasProducts ? (
        <SectionBlock title="No Governed Products">
          <div className="domain-products-state">
            Gateway returned an empty domain-product catalog for lotus-workbench.
          </div>
        </SectionBlock>
      ) : null}

      {hasPartialTrust ? (
        <SectionBlock
          title="Trust Attention"
          actions={<SemanticBadge tone={trustTone}>RFC-0087</SemanticBadge>}
        >
          <TrustAttention data={data} />
        </SectionBlock>
      ) : null}

      <section className="domain-products-overview" aria-label="Domain product summary">
        <SummaryTile label="Products" value={data.catalog.productCount} />
        <SummaryTile label="Consumers" value={data.catalog.consumers.length} />
        <SummaryTile label="Dependencies" value={data.catalog.dependencyCount} />
        <SummaryTile
          label="Certified"
          value={data.trustCertification.summary?.certifiedSnapshotCount ?? 0}
        />
      </section>

      <SectionBlock
        title="Governed Product Catalog"
        subtitle="Producer-owned contracts surfaced through gateway."
      >
        <div className="domain-products-grid">
          {products.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              trust={trustByProductId.get(product.productId)}
            />
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Consumer Dependency Catalog"
        subtitle="Approved consumers and declared dependencies."
      >
        <div className="domain-products-dependencies">
          {data.catalog.consumers.map((consumer) => (
            <div key={consumer.consumerRepository} className="domain-products-row">
              <div>
                <Text variant="label">{consumer.consumerRepository}</Text>
                <Text variant="secondary">{consumer.sourcePath}</Text>
              </div>
              <div className="domain-products-chip-row">
                {consumer.dependencies.map((dependency) => (
                  <SemanticBadge key={dependency.dependencyId}>
                    {dependency.productName} {dependency.requiredProductVersion}
                  </SemanticBadge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock title="Dependency Graph" subtitle="Gateway-rendered impact posture.">
        <div className="domain-products-graph">
          <SummaryTile label="Graph nodes" value={data.dependencyGraph.nodeCount} />
          <SummaryTile label="Graph edges" value={data.dependencyGraph.edgeCount} />
          <SummaryTile
            label="Fail-closed edges"
            value={
              data.dependencyGraph.edges.filter((edge) => edge.failurePosture === "fail_closed")
                .length
            }
          />
        </div>
      </SectionBlock>
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
    <main className="page-container domain-products-page">
      <WorkbenchPageFrame
        title="Domain Product Discovery"
        subtitle="Review governed data products, consumers, dependencies, and live trust posture from gateway."
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

function TrustAttention({ data }: { data: DomainProductDiscoveryData }) {
  if (!data.trustCertification.trustAvailable) {
    return (
      <div className="domain-products-state domain-products-state-warn">
        {data.trustCertification.unavailableReason ??
          "Live trust certification has not been generated."}
      </div>
    );
  }

  const issues = data.trustCertification.issues;
  if (issues.length === 0) {
    return (
      <div className="domain-products-state domain-products-state-warn">
        Trust posture is {formatStateLabel(data.trustCertification.trustPosture)}.
      </div>
    );
  }

  return (
    <div className="domain-products-issues">
      {issues.map((issue) => (
        <div key={`${issue.productId}:${issue.code}:${issue.detail}`} className="domain-products-row">
          <div>
            <Text variant="label">{issue.code}</Text>
            <Text variant="secondary">{issue.productId}</Text>
          </div>
          <Text variant="secondary">{issue.detail}</Text>
        </div>
      ))}
    </div>
  );
}

function ProductCard({
  product,
  trust,
}: {
  product: DomainProduct;
  trust: DomainProductTrustCertification | undefined;
}) {
  const trustState = trust?.certificationState ?? "unavailable";
  const trustTone = getTrustTone(trustState);

  return (
    <article className="domain-products-card">
      <div className="domain-products-card-header">
        <div>
          <Text variant="label">{product.producerRepository}</Text>
          <h2>{product.productName}</h2>
          <Text variant="secondary">{product.productVersion}</Text>
        </div>
        <SemanticBadge tone={trustTone}>{formatStateLabel(trustState)}</SemanticBadge>
      </div>
      <dl className="domain-products-facts">
        <div>
          <dt>Lifecycle</dt>
          <dd>{product.lifecycleStatus}</dd>
        </div>
        <div>
          <dt>Owner</dt>
          <dd>{product.ownerRepository}</dd>
        </div>
        <div>
          <dt>Approved consumers</dt>
          <dd>{product.approvedConsumers.join(", ") || "none"}</dd>
        </div>
        <div>
          <dt>Freshness</dt>
          <dd>{trust?.freshnessState ?? "unavailable"}</dd>
        </div>
        <div>
          <dt>Completeness</dt>
          <dd>{trust?.completenessStatus ?? "unavailable"}</dd>
        </div>
        <div>
          <dt>Lineage</dt>
          <dd>{trust?.lineageMaterialized ? "materialized" : "unavailable"}</dd>
        </div>
      </dl>
    </article>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="domain-products-summary-tile">
      <Text variant="label">{label}</Text>
      <strong>{value}</strong>
    </div>
  );
}

function getTrustTone(state: string): TrustTone {
  if (state === "certified") return "success";
  if (state === "attention_required" || state === "unavailable") return "warn";
  if (state === "blocked") return "danger";
  return "default";
}

function formatStateLabel(state: string): string {
  return state.replaceAll("_", " ");
}
