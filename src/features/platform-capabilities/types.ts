export type LotusCorePolicyDiagnostics = {
  available: boolean;
  allowedSections: string[];
  warnings: string[];
  policyProvenance: {
    policyVersion: string;
    policySource: string;
    matchedRuleId: string;
    strictMode: boolean;
  };
};

export type PlatformBootstrapSupportability = {
  state: string;
  reasons: string[];
};

export type PlatformBootstrapFreshness = {
  state: string;
  freshnessClass: string;
  evaluatedAt: string;
  maxAgeSeconds?: number | null;
};

export type PlatformBootstrapEvidence = {
  state: string;
  lineageSources: string[];
  partialFailure: boolean;
  sourceErrorServices: string[];
};

export type PlatformBootstrapVersioning = {
  shellContractVersion: string;
  capabilityContractVersion: string;
  sourcePolicyVersion?: string | null;
  sourcePolicyVersions?: Record<string, string>;
};

export type PlatformBootstrapCaching = {
  cacheMode: string;
  invalidationOwner: string;
  staleReadTolerance: string;
  revalidateOnNavigation: boolean;
  ttlSeconds?: number | null;
  correctnessCritical: boolean;
};

export type PlatformShellWorkspaceDescriptor = {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  supportability: PlatformBootstrapSupportability;
  freshness: PlatformBootstrapFreshness;
  evidence: PlatformBootstrapEvidence;
  versioning: PlatformBootstrapVersioning;
  caching: PlatformBootstrapCaching;
};

export type PlatformShellBootstrap = {
  contractVersion: string;
  supportability: PlatformBootstrapSupportability;
  freshness: PlatformBootstrapFreshness;
  evidence: PlatformBootstrapEvidence;
  versioning: PlatformBootstrapVersioning;
  caching: PlatformBootstrapCaching;
  workspaces: PlatformShellWorkspaceDescriptor[];
};

export type PlatformNormalizedCapabilities = {
  navigation: Record<string, boolean>;
  workflowFlags: Record<string, boolean>;
  inputModesBySource: Record<string, string[]>;
  inputModesUnion: string[];
  moduleHealth: Record<string, string>;
  policyVersionsBySource: Record<string, string>;
  lotusCorePolicyDiagnostics: LotusCorePolicyDiagnostics;
  shellBootstrap: PlatformShellBootstrap;
};

export type PlatformCapabilitiesError = {
  service: string;
  status_code: number;
  detail: string;
};

export type PlatformCapabilitiesEnvelope = {
  data: {
    consumerSystem: string;
    tenantId: string;
    contractVersion: string;
    sources: Record<string, Record<string, unknown>>;
    partialFailure: boolean;
    errors: PlatformCapabilitiesError[];
    normalized: PlatformNormalizedCapabilities;
  };
};

export const DEFAULT_NAVIGATION_FLAGS: Record<string, boolean> = {
  command_center: true,
  portfolio_intake: true,
  analytics_studio: true,
  advisory_pipeline: true,
  scenario_builder: true,
  decision_console: true,
  reporting_hub: false,
  portfolio_workspace: true,
  performance_workspace: true,
  risk_workspace: true,
  proposal_workspace: false,
  advisory_workspace: false,
};
