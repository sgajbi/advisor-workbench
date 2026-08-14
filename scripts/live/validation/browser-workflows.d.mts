import type {
  BrowserValidationHelpers,
  BrowserValidationPage,
  PanelRegistryEntry,
  ValidationSummary,
} from "./shared-types";

export function createBrowserValidationHelpers(input: {
  outputDir: string;
  summary: ValidationSummary;
  portfolioId: string;
  benchmarkCode: string;
  canonicalAsOfDate: string;
  timeoutMs: number;
  panelRegistryById: Map<string, Pick<PanelRegistryEntry, "screenshotName" | "route">>;
}): BrowserValidationHelpers;

export function hasAcceptedAdvisorBriefReviewPosture(text: string): boolean;
export function hasRecordedAdvisorBriefAcceptProof(
  text: string,
  expectedReviewer: string,
): boolean;
export function classifyAdvisorBriefAcceptProofPosture(
  text: string,
  expectedReviewer: string,
):
  | "source-confirmed-existing-action"
  | "accepted-by-another-reviewer"
  | "review-action-available";

export function validatePortfolioPanels(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
export function validateReportCentrePanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
export function validateAdvisorBookPanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
export function validatePerformanceSummaryPanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
export function validatePerformanceAnalysisPanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
export function validateAdvisorBriefPanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<{ detailBasis: string; chartFrequency: string } | null>;
export function validateRiskPanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
export function validateEvidencePanel(
  page: BrowserValidationPage,
  options: Record<string, unknown>
): Promise<void>;
