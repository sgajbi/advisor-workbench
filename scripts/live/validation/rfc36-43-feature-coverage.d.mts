import type { ValidationSummary } from "./shared-types";

export interface RfcFeatureCoverageEvidence {
  [key: string]: unknown;
}

export interface RfcFeatureCoverageRow {
  rfcId: string;
  auditScope: "rfc36-43" | "adjacent-front-office";
  featureId: string;
  featureName: string;
  owner: string;
  requiredEvidence: string[];
  uiPanels: string[];
  coverageStatus: "validated" | "gap";
  missingEvidence: string[];
  panelStates: Record<string, string>;
  missingPanels: string[];
  scenarioScope?: string;
  scenarioExpansionNeeded?: string[];
  unsupportedClaimsExcluded: string[];
}

export interface RfcFeatureCoverageMatrix {
  contractId: string;
  contractVersion: string;
  portfolioId?: string;
  benchmarkCode?: string;
  coverageRows: RfcFeatureCoverageRow[];
  validatedFeatureCount: number;
  gapFeatureCount: number;
  rfc3643FeatureCount: number;
  validatedRfc3643FeatureCount: number;
  rfc3643GapFeatureCount: number;
  adjacentEvidenceFeatureCount: number;
  validatedAdjacentEvidenceFeatureCount: number;
  adjacentEvidenceGapFeatureCount: number;
  scenarioExpansionNeeded: string[];
}

export function buildRfc3643FeatureCoverage(
  summary: ValidationSummary,
  evidence: RfcFeatureCoverageEvidence
): RfcFeatureCoverageMatrix;

export function assertRfc3643FeatureCoverage(summary: ValidationSummary): void;
