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

export type DomainProductDiscoveryData = {
  catalog: DomainProductCatalogData;
  dependencyGraph: DomainProductGraphData;
  trustCertification: DomainProductTrustCertificationData;
};

type GatewayEnvelope<T> = {
  data: T;
};

async function fetchGatewayData<T>(path: string): Promise<T> {
  const params = new URLSearchParams({ consumerSystem: "lotus-workbench" });
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

export async function getDomainProductDiscovery(): Promise<DomainProductDiscoveryData> {
  const [catalog, dependencyGraph, trustCertification] = await Promise.all([
    fetchGatewayData<DomainProductCatalogData>("/domain-products/catalog"),
    fetchGatewayData<DomainProductGraphData>("/domain-products/dependency-graph"),
    fetchGatewayData<DomainProductTrustCertificationData>(
      "/domain-products/trust-certification"
    ),
  ]);

  return {
    catalog,
    dependencyGraph,
    trustCertification,
  };
}
