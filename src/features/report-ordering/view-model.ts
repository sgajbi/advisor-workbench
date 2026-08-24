import {
  formatBusinessDateValue,
  formatTimestampValue,
  isBusinessDateValue,
} from "@/design-system/utils/financial-formatters";
import type {
  ReportFamily,
  ReportJobListItem,
  ReportOrderingMode,
  ReportOrderingResponse,
  ReportOutputFormat,
  ReportSection,
} from "./contracts";

export type ReportOrderingConfiguration = {
  familyId: string;
  modeId: string;
  asOfDate: string;
  reportingCurrency: string;
  benchmarkCode: string;
  allocationDimensions: string[];
  selectedSections: string[];
  outputFormat: "json" | "pdf";
};

export type ReportOrderingScopeMode = "single_portfolio" | "explicit_portfolio_batch";

export type ReportOrderingReadiness = {
  state: "ready" | "partial" | "blocked";
  title: string;
  detail: string;
  issues: string[];
};

export type ReportOrderingViewModel = {
  family: ReportFamily | null;
  mode: ReportOrderingMode | null;
  configuration: ReportOrderingConfiguration;
  readiness: ReportOrderingReadiness;
  batchReadiness: ReportOrderingReadiness;
  eligibleFamilies: ReportFamily[];
  workflowManagedFamilies: ReportFamily[];
  outputChoices: Array<{
    id: "json" | "pdf";
    label: string;
    detail: string;
    available: boolean;
    supportReason: string;
  }>;
  sectionChoices: Array<{
    id: string;
    label: string;
    detail: string;
    required: boolean;
    selected: boolean;
    dependencyLabels: string[];
  }>;
  audienceLabel: string;
  clientReleaseLabel: string;
  canSubmit: boolean;
};

export type ReportRequestRow = {
  key: string;
  reportLabel: string;
  reportDate: string;
  requestedAt: string;
  statusLabel: string;
  statusDetail: string;
  tone: "default" | "success" | "warn" | "danger";
  supportReference: string;
};

export function createReportOrderingConfiguration(
  response: ReportOrderingResponse,
  context: { asOfDate: string; reportingCurrency: string },
): ReportOrderingConfiguration {
  const family = firstEligibleFamily(response);
  const mode = family ? firstSupportedMode(family) : null;
  const outputFormat = resolveReadyOutputFormat(family, mode);

  return {
    familyId: family?.reportFamilyId ?? "",
    modeId: mode?.modeId ?? "",
    asOfDate: context.asOfDate,
    reportingCurrency: context.reportingCurrency,
    benchmarkCode: "",
    allocationDimensions: [],
    selectedSections: family ? defaultSelectedSectionIds(family) : [],
    outputFormat,
  };
}

export function selectReportOrderingFamily(
  response: ReportOrderingResponse,
  current: ReportOrderingConfiguration,
  familyId: string,
): ReportOrderingConfiguration {
  const family = response.reportFamilies.find(
    (candidate) =>
      candidate.reportFamilyId === familyId &&
      candidate.eligibility.state === "ready" &&
      firstSupportedMode(candidate),
  );
  const mode = family ? firstSupportedMode(family) : null;
  if (!family || !mode) {
    return current;
  }

  return {
    ...current,
    familyId: family.reportFamilyId,
    modeId: mode.modeId,
    benchmarkCode: "",
    allocationDimensions: [],
    selectedSections: defaultSelectedSectionIds(family),
    outputFormat: resolveReadyOutputFormat(family, mode),
  };
}

export function buildReportOrderingViewModel(
  response: ReportOrderingResponse,
  configuration: ReportOrderingConfiguration,
): ReportOrderingViewModel {
  const eligibleFamilies = response.reportFamilies.filter(
    (family) => family.eligibility.state === "ready" && firstSupportedMode(family),
  );
  const workflowManagedFamilies = response.reportFamilies.filter(
    (family) => family.eligibility.state === "ready" && !firstSupportedMode(family),
  );
  const family =
    eligibleFamilies.find((candidate) => candidate.reportFamilyId === configuration.familyId) ??
    null;
  const mode =
    family?.orderingModes.find((candidate) => candidate.modeId === configuration.modeId) ?? null;
  const readiness = evaluateReadiness(
    response,
    family,
    findSinglePortfolioMode(family),
    configuration,
    "single_portfolio",
  );
  const batchReadiness = evaluateReadiness(
    response,
    family,
    findPortfolioReviewBatchMode(family),
    configuration,
    "explicit_portfolio_batch",
  );
  const sectionChoices = family
    ? family.sections
        .slice()
        .sort(byDisplayOrder)
        .map((section) => toSectionChoice(section, family, configuration))
    : [];

  return {
    family,
    mode,
    configuration,
    readiness,
    batchReadiness,
    eligibleFamilies,
    workflowManagedFamilies,
    outputChoices: (family?.outputFormats ?? []).map(toOutputChoice),
    sectionChoices,
    audienceLabel: family ? audienceLabel(family.audienceRoles) : "No eligible audience",
    clientReleaseLabel: family
      ? clientReleaseLabel(family.clientReleasePosture)
      : "Client release posture is unavailable.",
    canSubmit: readiness.state === "ready",
  };
}

export function applyReportScopeReadiness(
  model: ReportOrderingViewModel,
  scopeMode: ReportOrderingScopeMode,
  selectedPortfolioIds: string[],
  portfolioSelectionState: "loading" | "ready" | "error" = "ready",
): ReportOrderingViewModel {
  if (scopeMode === "single_portfolio") {
    return model;
  }
  const issues = [...model.batchReadiness.issues];
  if (portfolioSelectionState !== "ready") {
    issues.push(
      portfolioSelectionState === "error"
        ? "Portfolio assignments are unavailable. Restore My book before reviewing this bundle."
        : "Portfolio assignments are still loading.",
    );
  }
  if (selectedPortfolioIds.length < 2) {
    issues.push("Select at least two portfolios from your book for a portfolio bundle.");
  }
  if (issues.length === 0) {
    return {
      ...model,
      readiness: {
        state: "ready",
        title: "Bundle ready for review",
        detail: `${selectedPortfolioIds.length} portfolios will be verified by Gateway before report creation.`,
        issues: [],
      },
      canSubmit: true,
    };
  }
  return {
    ...model,
    readiness: {
      state: "blocked",
      title: "Complete the portfolio bundle",
      detail: "Resolve the highlighted items before reviewing this report bundle.",
      issues: [...new Set(issues)],
    },
    canSubmit: false,
  };
}

export function findPortfolioReviewBatchMode(
  family: ReportFamily | null,
): ReportOrderingMode | null {
  return family?.orderingModes.find(
    (mode) =>
      mode.modeId === "explicit_portfolio_batch" &&
      mode.interactive &&
      mode.eligibility.state === "partial" &&
      mode.eligibility.reasonCode === "explicit_portfolio_selection_required" &&
      mode.submission?.capabilityId === "reporting.portfolio_review.explicit_batch" &&
      mode.submission.path === "/api/v1/report-batches" &&
      mode.submission.state === "partial" &&
      mode.submission.reasonCode === "explicit_portfolio_selection_required",
  ) ?? null;
}

export function configurationFingerprint(configuration: ReportOrderingConfiguration): string {
  return JSON.stringify({
    ...configuration,
    allocationDimensions: [...configuration.allocationDimensions].sort(),
    selectedSections: [...configuration.selectedSections].sort(),
  });
}

export function toReportRequestRows(items: ReportJobListItem[]): ReportRequestRow[] {
  return items.map((item) => {
    const lifecycle = reportLifecycleCopy(item.status, item.currentStep);
    return {
      key: item.reportJobId,
      reportLabel: "Portfolio review",
      reportDate: formatBusinessDateValue(item.asOfDate, { nullDisplay: "Date unavailable" }),
      requestedAt: formatTimestampValue(item.createdAt, { nullDisplay: "Time unavailable" }),
      statusLabel: lifecycle.label,
      statusDetail: lifecycle.detail,
      tone: lifecycle.tone,
      supportReference: item.reportJobId,
    };
  });
}

function evaluateReadiness(
  response: ReportOrderingResponse,
  family: ReportFamily | null,
  mode: ReportOrderingMode | null,
  configuration: ReportOrderingConfiguration,
  scopeMode: ReportOrderingScopeMode,
): ReportOrderingReadiness {
  const issues: string[] = [];
  if (response.catalogueAvailability.state === "unavailable") {
    issues.push(response.catalogueAvailability.message);
  }
  if (response.scopeEligibility.state !== "ready") {
    issues.push(response.scopeEligibility.message);
  }
  if (!family) {
    issues.push("No report is available for the selected portfolio and business role.");
  } else if (family.availability.state === "unavailable") {
    issues.push(family.availability.message);
  }
  if (scopeMode === "single_portfolio") {
    if (!mode) {
      issues.push("Single-portfolio ordering is not currently available for this report.");
    }
  } else if (!mode) {
    issues.push("Portfolio bundle ordering is not currently published for this report.");
  }
  if (!isBusinessDateValue(configuration.asOfDate)) {
    issues.push("Select a valid report date.");
  }
  if (
    family?.configurationFields.some(
      (field) => field.fieldId === "reporting_currency",
    ) &&
    configuration.reportingCurrency &&
    !/^[A-Z]{3}$/.test(configuration.reportingCurrency)
  ) {
    issues.push("Enter a three-letter reporting currency, such as SGD or USD.");
  }

  const output = family?.outputFormats.find(
    (candidate) => candidate.formatId === configuration.outputFormat,
  );
  if (!output || output.state !== "ready") {
    issues.push("Select an output that is currently available.");
  }

  for (const section of family?.sections ?? []) {
    if (
      section.selectionPosture === "required" &&
      !configuration.selectedSections.includes(section.sectionId)
    ) {
      issues.push(`${section.businessLabel} is required.`);
    }
  }
  if ((family?.sections ?? []).length > 0 && configuration.selectedSections.length === 0) {
    issues.push("Select at least one report section.");
  }

  const uniqueIssues = [...new Set(issues)];
  if (uniqueIssues.length > 0) {
    return {
      state: "blocked",
      title: "Complete the report setup",
      detail: "Resolve the highlighted items before submitting this report request.",
      issues: uniqueIssues,
    };
  }
  if (
    response.catalogueAvailability.state === "partial" ||
    family?.availability.state === "partial"
  ) {
    return {
      state: "ready",
      title: "Ready with available outputs",
      detail: "The report data package is ready. Unavailable document outputs remain excluded.",
      issues: [],
    };
  }
  return {
    state: "ready",
    title: "Ready to request",
    detail: "The selected report and configuration are available for this portfolio.",
    issues: [],
  };
}

function firstEligibleFamily(response: ReportOrderingResponse): ReportFamily | null {
  return (
    response.reportFamilies.find(
      (family) => family.eligibility.state === "ready" && firstSupportedMode(family),
    ) ?? null
  );
}

function defaultSelectedSectionIds(family: ReportFamily): string[] {
  return family.sections
    .filter((section) => section.selectionPosture === "required" || section.defaultSelected)
    .sort(byDisplayOrder)
    .map((section) => section.sectionId);
}

function findSinglePortfolioMode(family: ReportFamily | null): ReportOrderingMode | null {
  return (
    family?.orderingModes.find(
      (mode) =>
        mode.modeId === "single_portfolio" &&
        mode.interactive &&
        mode.eligibility.state === "ready" &&
        mode.submission?.capabilityId === "reporting.portfolio_review.single" &&
        mode.submission.path === "/api/v1/reports/portfolio-reviews" &&
        mode.submission.state === "ready",
    ) ?? null
  );
}

function firstSupportedMode(family: ReportFamily): ReportOrderingMode | null {
  return findSinglePortfolioMode(family) ?? findPortfolioReviewBatchMode(family);
}

function resolveReadyOutputFormat(
  family: ReportFamily | null,
  mode: ReportOrderingMode | null,
): "json" | "pdf" {
  const preferred = family?.outputFormats.find(
    (format) => format.formatId === mode?.defaultOutputFormat && format.state === "ready",
  );
  return preferred?.formatId ?? family?.outputFormats.find((format) => format.state === "ready")?.formatId ?? "json";
}

function toOutputChoice(output: ReportOutputFormat) {
  return {
    id: output.formatId,
    label: output.businessLabel,
    detail:
      output.usePosture === "governed_document"
        ? "Governed document for advisor review. Client distribution is a separate control."
        : "Structured report data for review and downstream workflows.",
    available: output.state === "ready",
    supportReason: outputAvailabilityCopy(output),
  };
}

function outputAvailabilityCopy(output: ReportOutputFormat): string {
  if (output.state === "ready") {
    return output.formatId === "json"
      ? "Report data is available."
      : "Governed document creation is available.";
  }
  if (output.reasonCode === "render_metadata_unavailable") {
    return "Governed PDF creation is temporarily unavailable while document rendering is restored.";
  }
  return output.state === "partial"
    ? "This output is available with limitations."
    : "This output is not currently available.";
}

function toSectionChoice(
  section: ReportSection,
  family: ReportFamily,
  configuration: ReportOrderingConfiguration,
) {
  const fieldsById = new Map(
    family.configurationFields.map((field) => [field.fieldId, field.businessLabel]),
  );
  return {
    id: section.sectionId,
    label: section.businessLabel,
    detail: section.description,
    required: section.selectionPosture === "required",
    selected: configuration.selectedSections.includes(section.sectionId),
    dependencyLabels: section.dependencyFieldIds.map(
      (fieldId) => fieldsById.get(fieldId) ?? "Additional report context",
    ),
  };
}

function audienceLabel(roles: string[]): string {
  const labels = roles.map((role) => {
    if (role === "client_advisor") return "Client advisor";
    if (role === "portfolio_manager") return "Portfolio manager";
    if (role === "investment_control") return "Investment control";
    if (role === "audit") return "Audit";
    return "Authorized internal user";
  });
  return [...new Set(labels)].join(" · ");
}

function clientReleaseLabel(posture: ReportFamily["clientReleasePosture"]): string {
  return posture === "advisor_review_required_distribution_not_supported"
    ? "Advisor review is required. Client distribution is not included in this request."
    : "For internal control use only. Client distribution is not supported.";
}

function reportLifecycleCopy(status: string, currentStep: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "succeeded") {
    return {
      label: "Report data complete",
      detail: "Report data is complete. Archive and client delivery remain separate states.",
      tone: "success" as const,
    };
  }
  if (normalized === "failed") {
    return {
      label: "Request failed",
      detail: "The report request needs operational review before it can be retried.",
      tone: "danger" as const,
    };
  }
  if (normalized === "cancelled") {
    return {
      label: "Request cancelled",
      detail: "This request was cancelled before completion.",
      tone: "default" as const,
    };
  }
  if (normalized.includes("partial")) {
    return {
      label: "Completed with attention items",
      detail: "Some report evidence needs review before the result can be used.",
      tone: "warn" as const,
    };
  }
  if (normalized === "accepted" || normalized === "queued") {
    return {
      label: "Queued",
      detail: "The request is recorded and waiting to be prepared.",
      tone: "warn" as const,
    };
  }
  return {
    label: "Preparing report data",
    detail:
      currentStep.toLowerCase() === "accepted"
        ? "The request is recorded and waiting to be prepared."
        : "Reporting is preparing the selected evidence and sections.",
    tone: "warn" as const,
  };
}

function byDisplayOrder(left: ReportSection, right: ReportSection): number {
  return left.displayOrder - right.displayOrder;
}
