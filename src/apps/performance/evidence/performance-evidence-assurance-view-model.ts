import type {
  PerformanceCalculationEvidenceView,
  PerformanceEvidenceArtifactView,
  PerformanceEvidenceView,
} from "@/features/workbench/types";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

export type PerformanceEvidenceTone = "default" | "success" | "warn" | "danger";

export type PerformanceEvidenceException = {
  key: string;
  title: string;
  detail: string;
  action: string;
  tone: Exclude<PerformanceEvidenceTone, "success">;
};

export type PerformanceEvidenceRecord = {
  key: string;
  label: string;
  href: string;
  support: string;
};

export type PerformanceCalculationAssurance = {
  key: string;
  title: string;
  purpose: string;
  calculationStatus: string;
  calculationTone: PerformanceEvidenceTone;
  evidenceStatus: string;
  evidenceTone: PerformanceEvidenceTone;
  evidenceCount: number;
  records: PerformanceEvidenceRecord[];
};

export type PerformanceEvidenceSupportGroup = {
  key: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export type PerformanceEvidenceAssuranceViewModel = {
  state: "ready" | "attention" | "incomplete" | "unavailable";
  posture: string;
  tone: PerformanceEvidenceTone;
  summary: string;
  context: Array<{ label: string; value: string }>;
  metrics: Array<{ label: string; value: string; support: string }>;
  exceptions: PerformanceEvidenceException[];
  calculations: PerformanceCalculationAssurance[];
  methodologyCount: number;
  supportGroups: PerformanceEvidenceSupportGroup[];
};

const CALCULATION_ROLE_PRESENTATION: Record<string, { title: string; purpose: string }> = {
  workspace_summary: {
    title: "Portfolio performance summary",
    purpose: "Supports the selected portfolio return and benchmark review.",
  },
  workspace_details: {
    title: "Performance analysis detail",
    purpose: "Supports the selected analytical breakdown and its underlying observations.",
  },
};

const DIMENSION_LABELS: Record<string, string> = {
  asset_class: "Asset class",
  country: "Country",
  currency: "Currency",
  issuer: "Issuer",
  sector: "Sector",
};

const COMPLETE_STATUS = "complete";
const PENDING_STATUSES = new Set(["accepted", "pending", "queued", "running", "processing"]);
const FAILED_STATUSES = new Set(["cancelled", "failed", "rejected", "unavailable"]);
const FRESH_STATES = new Set(["current", "fresh"]);
const STALE_STATES = new Set(["expired", "stale"]);
const UNAVAILABLE_STATES = new Set(["missing", "unavailable"]);

export function buildPerformanceEvidenceAssuranceViewModel(
  capability: WorkspaceCapability,
  evidence: PerformanceEvidenceView
): PerformanceEvidenceAssuranceViewModel {
  const calculations = safeArray(evidence.calculations).map(buildCalculationAssurance);
  const exceptions = buildExceptions(capability, evidence);
  const completeCalculations = calculations.filter(
    (calculation) =>
      calculation.calculationTone === "success" && calculation.evidenceTone === "success"
  ).length;
  const evidenceCount = calculations.reduce(
    (total, calculation) => total + calculation.evidenceCount,
    0
  );
  const state = resolveAssuranceState(capability, evidence, calculations, exceptions);
  const posture = {
    ready: "Ready for internal review",
    attention: "Attention required",
    incomplete: "Incomplete evidence",
    unavailable: "Assurance unavailable",
  }[state];
  const tone: PerformanceEvidenceTone = {
    ready: "success",
    attention: "danger",
    incomplete: "warn",
    unavailable: "default",
  }[state] as PerformanceEvidenceTone;

  return {
    state,
    posture,
    tone,
    summary: assuranceSummary(state),
    context: buildContext(evidence),
    metrics: [
      {
        label: "Calculation coverage",
        value: `${completeCalculations} of ${calculations.length}`,
        support: "Calculations with both completion and supporting-evidence confirmation.",
      },
      {
        label: "Review items",
        value: String(exceptions.length),
        support: exceptions.length
          ? "Items to resolve or qualify before relying on the evidence package."
          : "No source-reported evidence exception is present.",
      },
      {
        label: "Supporting records",
        value: String(evidenceCount),
        support: "Source-published records available from the calculation evidence package.",
      },
    ],
    exceptions,
    calculations,
    methodologyCount: safeStrings(evidence.methodology_references).length,
    supportGroups: buildSupportGroups(capability, evidence),
  };
}

function resolveAssuranceState(
  capability: WorkspaceCapability,
  evidence: PerformanceEvidenceView,
  calculations: PerformanceCalculationAssurance[],
  exceptions: PerformanceEvidenceException[]
): PerformanceEvidenceAssuranceViewModel["state"] {
  if (capability.state === "unavailable" || capability.state === "hidden") return "unavailable";
  if (normalise(evidence.state) === "unavailable") return "unavailable";
  if (!calculations.length) return "incomplete";
  if (exceptions.some((exception) => exception.tone === "danger")) return "attention";
  if (
    capability.state !== "supported" ||
    normalise(evidence.state) !== "supported" ||
    exceptions.length > 0 ||
    calculations.some(
      (calculation) =>
        calculation.calculationTone !== "success" || calculation.evidenceTone !== "success"
    )
  ) {
    return "incomplete";
  }
  return "ready";
}

function assuranceSummary(state: PerformanceEvidenceAssuranceViewModel["state"]): string {
  if (state === "ready") {
    return "The selected performance result has source-confirmed calculation and supporting evidence for internal review. This does not constitute client-release or regulatory approval.";
  }
  if (state === "attention") {
    return "A source-reported control exception affects the selected evidence package. Review the affected calculation before relying on the result.";
  }
  if (state === "incomplete") {
    return "The selected result remains visible, but its calculation or supporting evidence is not fully confirmed. Keep the package within internal review.";
  }
  return "The source could not confirm a usable calculation-assurance package for the selected performance view.";
}

function buildContext(evidence: PerformanceEvidenceView) {
  return [
    { label: "As of", value: displayValue(evidence.as_of_date) },
    { label: "Review period", value: displayValue(evidence.period) },
    { label: "Return basis", value: basisLabel(evidence.basis) },
    { label: "Benchmark", value: displayValue(evidence.benchmark_code, "Not assigned") },
  ];
}

function buildCalculationAssurance(
  calculation: PerformanceCalculationEvidenceView,
  index: number
): PerformanceCalculationAssurance {
  const role = CALCULATION_ROLE_PRESENTATION[normalise(calculation.calculation_role)] ?? {
    title: `Additional performance calculation ${index + 1}`,
    purpose: "Provides additional source-published calculation evidence for the selected view.",
  };
  const calculationStatus = lifecyclePresentation(calculation.execution_status, "calculation");
  const evidenceStatus = lifecyclePresentation(calculation.lineage_status, "evidence");
  const records = safeArray(calculation.artifacts).map((artifact, artifactIndex) =>
    buildRecord(artifact, artifactIndex)
  );

  return {
    key: calculation.calculation_id || `calculation-${index}`,
    title: role.title,
    purpose: role.purpose,
    calculationStatus: calculationStatus.label,
    calculationTone: calculationStatus.tone,
    evidenceStatus: evidenceStatus.label,
    evidenceTone: evidenceStatus.tone,
    evidenceCount: records.length,
    records,
  };
}

function lifecyclePresentation(
  value: string | null | undefined,
  subject: "calculation" | "evidence"
): { label: string; tone: PerformanceEvidenceTone } {
  const state = normalise(value);
  if (state === COMPLETE_STATUS) return { label: "Confirmed", tone: "success" };
  if (PENDING_STATUSES.has(state)) return { label: "In progress", tone: "warn" };
  if (FAILED_STATUSES.has(state)) return { label: "Attention required", tone: "danger" };
  return { label: subject === "calculation" ? "Not reported" : "Not confirmed", tone: "default" };
}

function buildRecord(
  artifact: PerformanceEvidenceArtifactView,
  index: number
): PerformanceEvidenceRecord {
  const name = normalise(artifact.artifact_name);
  const label =
    name === "request.json"
      ? "Calculation input record"
      : name === "lineage.json"
        ? "Calculation lineage record"
        : artifact.archive_document_id
          ? "Archived evidence document"
          : `Supporting record ${index + 1}`;
  return {
    key: `${artifact.artifact_name}-${index}`,
    label,
    href: artifact.archive_document_download_url ?? artifact.url,
    support: artifact.archive_document_id
      ? "Open the governed archived document through the Workbench evidence boundary."
      : "Open the source-published record for this calculation.",
  };
}

function buildExceptions(
  capability: WorkspaceCapability,
  evidence: PerformanceEvidenceView
): PerformanceEvidenceException[] {
  const exceptions: PerformanceEvidenceException[] = [];
  const evidenceState = normalise(evidence.state);
  if (capability.state === "partial" || evidenceState === "partial") {
    exceptions.push({
      key: "evidence-package-partial",
      title: "Evidence package incomplete",
      detail: "One or more calculation or supporting-evidence checks are not fully confirmed.",
      action: "Review the affected calculation and keep the result within internal review.",
      tone: "warn",
    });
  } else if (evidenceState !== "supported" && evidenceState !== "unavailable") {
    exceptions.push({
      key: "evidence-state-not-reported",
      title: "Assurance status not reported",
      detail: "The source did not publish a recognised assurance state for this selection.",
      action: "Use support details to identify the source reference before relying on the package.",
      tone: "warn",
    });
  }

  safeArray(evidence.calculations).forEach((calculation, index) => {
    appendLifecycleException(exceptions, calculation.execution_status, "calculation", index);
    appendLifecycleException(exceptions, calculation.lineage_status, "evidence", index);
  });

  Object.entries(evidence.input_freshness ?? {}).forEach(([key, value]) => {
    const state = normalise(value);
    if (FRESH_STATES.has(state)) return;
    const label = DIMENSION_LABELS[normalise(key)] ?? "Required input";
    if (STALE_STATES.has(state)) {
      exceptions.push({
        key: `freshness-${key}`,
        title: `${label} evidence is not current`,
        detail: "The source reports that an input used by the evidence package is stale.",
        action: "Refresh the source calculation before using the result for a current review.",
        tone: "danger",
      });
    } else {
      exceptions.push({
        key: `freshness-${key}`,
        title: `${label} freshness not confirmed`,
        detail: UNAVAILABLE_STATES.has(state)
          ? "The source could not provide this input for the evidence package."
          : "The source did not publish a recognised freshness state for this input.",
        action: "Review the source limitation and supporting records before relying on the package.",
        tone: "warn",
      });
    }
  });

  safeArray(evidence.source_supportability).forEach((item, index) => {
    const state = normalise(item.state);
    if (state === "supported") return;
    exceptions.push({
      key: `source-supportability-${item.key || index}`,
      title: state === "unavailable" ? "Source calculation unavailable" : "Source assurance qualified",
      detail:
        state === "unavailable"
          ? "A source calculation required by this evidence package is unavailable."
          : "A source calculation does not have fully supported assurance posture.",
      action: "Review the source reason in support details and obtain refreshed evidence.",
      tone: state === "unavailable" ? "danger" : "warn",
    });
  });

  if (safeStrings(evidence.fallbacks).length) {
    exceptions.push({
      key: "fallbacks",
      title: "Alternate calculation path applied",
      detail: "The source reports that one or more fallback paths were used for this evidence package.",
      action: "Review the fallback description in support details before relying on the result.",
      tone: "warn",
    });
  }
  if (safeStrings(evidence.limitations).length) {
    exceptions.push({
      key: "limitations",
      title: "Source limitation applies",
      detail: "The source has qualified the scope or completeness of this evidence package.",
      action: "Review the source limitation in support details and retain the package for internal review only.",
      tone: "warn",
    });
  }

  const unsupportedDimensions = safeStrings(evidence.coverage?.unsupported_dimensions);
  if (unsupportedDimensions.length) {
    const knownLabels = unsupportedDimensions
      .map((dimension) => DIMENSION_LABELS[normalise(dimension)])
      .filter((label): label is string => Boolean(label));
    exceptions.push({
      key: "coverage-limit",
      title: "Evidence coverage is limited",
      detail: knownLabels.length
        ? `${knownLabels.join(", ")} ${knownLabels.length === 1 ? "is" : "are"} outside the published evidence coverage.`
        : `${unsupportedDimensions.length} additional evidence ${unsupportedDimensions.length === 1 ? "dimension is" : "dimensions are"} outside the published coverage.`,
      action: "Do not extend the evidence conclusion to dimensions the source does not support.",
      tone: "warn",
    });
  }
  return dedupeByKey(exceptions);
}

function appendLifecycleException(
  exceptions: PerformanceEvidenceException[],
  value: string | null | undefined,
  subject: "calculation" | "evidence",
  index: number
) {
  const state = normalise(value);
  if (state === COMPLETE_STATUS) return;
  const failed = FAILED_STATUSES.has(state);
  const pending = PENDING_STATUSES.has(state);
  exceptions.push({
    key: `${subject}-${index}`,
    title:
      subject === "calculation"
        ? failed
          ? "Calculation did not complete"
          : pending
            ? "Calculation still in progress"
            : "Calculation status not reported"
        : failed
          ? "Supporting evidence unavailable"
          : pending
            ? "Supporting evidence still being prepared"
            : "Supporting evidence not confirmed",
    detail:
      subject === "calculation"
        ? "The source has not confirmed a completed performance calculation for this item."
        : "The source has not confirmed complete lineage and supporting records for this item.",
    action: "Keep the affected result within internal review and obtain refreshed source evidence.",
    tone: failed ? "danger" : "warn",
  });
}

function buildSupportGroups(
  capability: WorkspaceCapability,
  evidence: PerformanceEvidenceView
): PerformanceEvidenceSupportGroup[] {
  const groups: PerformanceEvidenceSupportGroup[] = [];
  const sourceRows = [
    { label: "Gateway evidence state", value: displayValue(evidence.state) },
    { label: "Gateway capability state", value: capability.state },
    { label: "Evidence reason", value: displayValue(evidence.reason ?? capability.reason) },
    { label: "Calculation scope", value: displayValue(evidence.calculation_scope) },
    { label: "Generated at", value: displayValue(evidence.generated_at) },
    ...safeStrings(evidence.source_services).map((value, index) => ({
      label: `Source service ${index + 1}`,
      value,
    })),
    ...Object.entries(evidence.input_freshness ?? {}).map(([key, value]) => ({
      label: `Input freshness · ${key}`,
      value,
    })),
    ...Object.entries(evidence.calculation_versions ?? {}).map(([key, value]) => ({
      label: `Version · ${key}`,
      value,
    })),
  ];
  groups.push({ key: "source-contract", title: "Source contract", rows: sourceRows });

  const scopeRows = [
    ...safeStrings(evidence.methodology_references).map((value, index) => ({
      label: `Methodology reference ${index + 1}`,
      value,
    })),
    ...safeStrings(evidence.coverage?.supported_dimensions).map((value, index) => ({
      label: `Supported dimension ${index + 1}`,
      value,
    })),
    ...safeStrings(evidence.coverage?.unsupported_dimensions).map((value, index) => ({
      label: `Unsupported dimension ${index + 1}`,
      value,
    })),
    ...safeStrings(evidence.fallbacks).map((value, index) => ({
      label: `Fallback ${index + 1}`,
      value,
    })),
    ...safeStrings(evidence.limitations).map((value, index) => ({
      label: `Limitation ${index + 1}`,
      value,
    })),
  ];
  if (scopeRows.length) groups.push({ key: "scope", title: "Methodology and scope", rows: scopeRows });

  safeArray(evidence.calculations).forEach((calculation, index) => {
    groups.push({
      key: calculation.calculation_id || `calculation-${index}`,
      title: `Calculation ${index + 1}`,
      rows: buildCalculationSupportRows(calculation),
    });
  });
  return groups.filter((group) => group.rows.length > 0);
}

function buildCalculationSupportRows(calculation: PerformanceCalculationEvidenceView) {
  return [
    { label: "Calculation role", value: displayValue(calculation.calculation_role) },
    { label: "Calculation ID", value: displayValue(calculation.calculation_id) },
    { label: "Analytics type", value: displayValue(calculation.analytics_type) },
    { label: "Execution status", value: displayValue(calculation.execution_status) },
    { label: "Execution mode", value: displayValue(calculation.execution_mode) },
    { label: "Lineage status", value: displayValue(calculation.lineage_status) },
    { label: "Source reason", value: displayValue(calculation.reason) },
    ...safeArray(calculation.stage_statuses).flatMap((stage, index) => [
      { label: `Stage ${index + 1}`, value: `${stage.stage_name}: ${stage.status}` },
      ...(stage.completed_at_utc
        ? [{ label: `Stage ${index + 1} completed`, value: stage.completed_at_utc }]
        : []),
    ]),
    ...safeArray(calculation.upstream_snapshots).map((snapshot, index) => ({
      label: `Upstream snapshot ${index + 1}`,
      value: `${snapshot.upstream_endpoint} · ${snapshot.source_identifier} · ${snapshot.as_of_date} · ${snapshot.retrieval_status}`,
    })),
    ...safeArray(calculation.artifacts).map((artifact, index) => ({
      label: `Artifact ${index + 1}`,
      value: `${artifact.artifact_name} · ${artifact.archive_document_download_url ?? artifact.url}`,
    })),
  ];
}

function basisLabel(value: string | null | undefined) {
  const basis = normalise(value);
  if (basis === "net") return "Net of fees";
  if (basis === "gross") return "Gross of fees";
  return "Not reported";
}

function normalise(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function displayValue(value: unknown, fallback = "Not reported"): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text || fallback;
}

function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function safeStrings(value: string[] | null | undefined): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}

function dedupeByKey(items: PerformanceEvidenceException[]) {
  return items.filter((item, index) => items.findIndex((candidate) => candidate.key === item.key) === index);
}
