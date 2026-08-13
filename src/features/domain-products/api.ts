import {
  WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES,
  observeWorkbenchAnalyticsRequest,
  type WorkbenchAnalyticsUiObservationContext,
} from "@/features/analytics-observability/metrics";

const BFF_PROXY_BASE = "/api/bff/api/v1";

export type DomainProductRepositorySummary = {
  repository: string;
  producedProductCount: number;
  consumedDependencyCount: number;
};

export type DomainProduct = {
  productId: string;
  productName: string;
  productVersion: string;
  producerRepository: string;
  ownerRepository: string;
  authoritativeDomain: string;
  productFamily: string;
  lifecycleStatus: string;
  requiredTrustMetadata: string[];
  approvedConsumers: string[];
  currentRoutes: string[];
  sourcePath: string;
};

export type DomainProductDependency = {
  dependencyId: string;
  productName: string;
  producerRepository: string;
  requiredProductVersion: string;
  requiredTrustMetadata: string[];
  consumptionMode: string;
  businessPurpose: string;
  validationLanes: string[];
  failurePosture: string;
};

export type DomainProductConsumer = {
  consumerRepository: string;
  dependencyCount: number;
  sourcePath: string;
  dependencies: DomainProductDependency[];
};

export type DomainProductCatalogData = {
  consumerSystem: string;
  correlationId: string;
  contractId: string;
  contractVersion: string;
  generatedAtUtc: string;
  productCount: number;
  dependencyCount: number;
  repositoryCount: number;
  repositories: DomainProductRepositorySummary[];
  products: DomainProduct[];
  consumers: DomainProductConsumer[];
};

export type DomainProductGraphNode = {
  nodeId: string;
  nodeType: string;
  productId?: string | null;
  productName?: string | null;
  productVersion?: string | null;
  producerRepository?: string | null;
  repository?: string | null;
};

export type DomainProductGraphEdge = {
  edgeType: string;
  from: string;
  to: string;
  consumptionMode?: string | null;
  failurePosture?: string | null;
  validationLanes?: string[];
};

export type DomainProductGraphData = {
  consumerSystem: string;
  correlationId: string;
  contractId: string;
  contractVersion: string;
  generatedAtUtc: string;
  nodeCount: number;
  edgeCount: number;
  nodes: DomainProductGraphNode[];
  edges: DomainProductGraphEdge[];
};

export type DomainProductTrustSummary = {
  certificationState: string;
  telemetrySnapshotCount: number;
  certifiedSnapshotCount: number;
  attentionRequiredCount: number;
  issueCount: number;
};

export type DomainProductTrustCertification = {
  productId: string;
  producerRepository: string;
  productName: string;
  productVersion: string;
  sourceRepository: string;
  telemetryPath: string;
  emittedAtUtc: string;
  certificationState: string;
  freshnessState: string | null;
  completenessStatus: string | null;
  reconciliationStatus: string | null;
  dataQualityStatus: string | null;
  lineageMaterialized: boolean | null;
  blocked: boolean | null;
  issueCount: number;
};

export type DomainProductTrustIssue = {
  code: string;
  severity: string;
  productId: string;
  detail: string;
};

export type DomainProductTrustCertificationData = {
  consumerSystem: string;
  correlationId: string;
  trustAvailable: boolean;
  trustPosture: string;
  unavailableReason: string | null;
  contractId: string | null;
  contractVersion: string | null;
  governedByRfcs: string[];
  generatedAtUtc: string | null;
  sourceTelemetryPath: string | null;
  summary: DomainProductTrustSummary | null;
  productCertifications: DomainProductTrustCertification[];
  issues: DomainProductTrustIssue[];
};

type GatewayEnvelope<T> = {
  data: T;
};

type DomainProductObservedOperation = Extract<
  (typeof WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES)[number]["operation"],
  `domain-products.${string}`
>;

const DOMAIN_PRODUCT_OPERATION_BY_PATH = {
  "/domain-products/catalog": "domain-products.catalog",
  "/domain-products/dependency-graph": "domain-products.dependency-graph",
  "/domain-products/trust-certification": "domain-products.trust-certification",
} as const satisfies Record<string, DomainProductObservedOperation>;

function observedDomainProductSurface(
  path: keyof typeof DOMAIN_PRODUCT_OPERATION_BY_PATH
): WorkbenchAnalyticsUiObservationContext {
  const operation = DOMAIN_PRODUCT_OPERATION_BY_PATH[path];
  return WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES.find(
    (surface) => surface.operation === operation
  )!;
}

async function fetchGatewayData<T>(
  path: keyof typeof DOMAIN_PRODUCT_OPERATION_BY_PATH
): Promise<T> {
  const params = new URLSearchParams({ consumerSystem: "lotus-workbench" });
  return await observeWorkbenchAnalyticsRequest(
    observedDomainProductSurface(path),
    async () => {
      const response = await fetch(`${BFF_PROXY_BASE}${path}?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Domain product discovery fetch failed (${response.status}): ${detail}`);
      }
      const payload = (await response.json()) as GatewayEnvelope<T>;
      return payload.data;
    }
  );
}

export async function getDomainProductCatalog(): Promise<DomainProductCatalogData> {
  return await fetchGatewayData<DomainProductCatalogData>("/domain-products/catalog");
}

export async function getDomainProductDependencyGraph(): Promise<DomainProductGraphData> {
  return await fetchGatewayData<DomainProductGraphData>(
    "/domain-products/dependency-graph"
  );
}

export async function getDomainProductTrustCertification(): Promise<DomainProductTrustCertificationData> {
  return await fetchGatewayData<DomainProductTrustCertificationData>(
    "/domain-products/trust-certification"
  );
}
