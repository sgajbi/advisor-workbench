import type {
  CanonicalContractMetadata,
  PanelRegistryMetadata,
  ValidationSummary,
} from "./shared-types";

export type InitializedValidationSummary = ValidationSummary & {
  dns: Array<Record<string, unknown>>;
  apiChecks: Array<Record<string, unknown>>;
  uiChecks: Array<Record<string, unknown>>;
  calculationChecks: Array<Record<string, unknown>>;
  panelClassifications: Array<Record<string, unknown>>;
  supportabilityChecks: Array<Record<string, unknown>>;
  screenshots: Array<Record<string, unknown>>;
};

export function createValidationSummary(input: {
  generatedAt?: string;
  portfolioId: string;
  benchmarkCode: string;
  canonicalContract: CanonicalContractMetadata;
  panelRegistry: PanelRegistryMetadata;
  workbenchBaseUrl: string;
  gatewayBaseUrl: string;
}): InitializedValidationSummary;

export function ensureDirectory(target: string): Promise<void>;

export function buildSummaryPaths(outputDir: string): {
  summaryPath: string;
  shotIndexPath: string;
};

export function writeValidationSummary(
  summaryPath: string,
  summary: ValidationSummary
): Promise<void>;

export function writeShotIndex(
  shotIndexPath: string,
  summary: ValidationSummary,
  validationSummaryPath: string
): Promise<void>;
