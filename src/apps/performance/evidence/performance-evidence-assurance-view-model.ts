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
  href: string | null;
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
const REQUIRED_INPUT_LABELS = {
  performance: "Performance input",
  benchmark: "Benchmark input",
} as const;

const COMPLETE_STATUS = "complete";
const PENDING_STATUSES: readonly string[] = ["accepted", "pending", "queued", "running", "processing"];
const FAILED_STATUSES: readonly string[] = ["cancelled", "failed", "rejected", "unavailable"];
const FRESH_STATES: readonly string[] = ["current", "fresh"];
const STALE_STATES: readonly string[] = ["expired", "stale"];
const UNAVAILABLE_STATES: readonly string[] = ["missing", "unavailable"];
const READY_SUPPORTABILITY_STATES: readonly string[] = [
  "ready",
  "supported",
  "ok",
  "complete",
  "source_backed",
  "caller_supplied",
];
const PARTIAL_SUPPORTABILITY_STATES: readonly string[] = ["partial", "stale", "source_limited"];
const ACTION_REQUIRED_SUPPORTABILITY_STATES: readonly string[] = [
  "blocked",
  "degraded",
  "unavailable",
  "unsupported",
  "action_required",
];
const GATEWAY_API_PREFIX = "/api/v1/";
const WORKBENCH_BFF_API_PREFIX = "/api/bff/api/v1/";

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
  if (exceptions.some((exception) => exception.tone === "danger")) return "attention";
  if (!calculations.length) return "incomplete";
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
    { label: "Benchmark", value: evidence.benchmark_code?.trim() ? "Assigned" : "Not assigned" },
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
  const calculationStatus = resolveCalculationLifecyclePresentation(calculation);
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

function resolveCalculationLifecyclePresentation(
  calculation: PerformanceCalculationEvidenceView
): { label: string; tone: PerformanceEvidenceTone } {
  const aggregate = lifecyclePresentation(calculation.execution_status, "calculation");
  const stageStates = safeArray(calculation.stage_statuses).map((stage) => normalise(stage.status));
  if (!stageStates.length || stageStates.every((state) => state === COMPLETE_STATUS)) {
    return aggregate;
  }

  const stagePresentation = stageStates.some((state) => FAILED_STATUSES.includes(state))
    ? { label: "Attention required", tone: "danger" as const }
    : stageStates.some((state) => PENDING_STATUSES.includes(state))
      ? { label: "In progress", tone: "warn" as const }
      : { label: "Not confirmed", tone: "default" as const };
  const tonePriority: Record<PerformanceEvidenceTone, number> = {
    default: 1,
    success: 0,
    warn: 2,
    danger: 3,
  };
  return tonePriority[stagePresentation.tone] > tonePriority[aggregate.tone]
    ? stagePresentation
    : aggregate;
}

function lifecyclePresentation(
  value: string | null | undefined,
  subject: "calculation" | "evidence"
): { label: string; tone: PerformanceEvidenceTone } {
  const state = normalise(value);
  if (state === COMPLETE_STATUS) return { label: "Confirmed", tone: "success" };
  if (PENDING_STATUSES.includes(state)) return { label: "In progress", tone: "warn" };
  if (FAILED_STATUSES.includes(state)) return { label: "Attention required", tone: "danger" };
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
  const href = buildEvidenceRecordHref(
    artifact.archive_document_download_url ?? artifact.url
  );
  return {
    key: `${artifact.artifact_name}-${index}`,
    label,
    href,
    support: href
      ? artifact.archive_document_id
        ? "Open the governed archived document through the Workbench evidence boundary."
        : "Open the source-published record through the Workbench evidence boundary."
      : "This source-published route is not available through the Workbench evidence boundary.",
  };
}

function buildEvidenceRecordHref(value: string | null | undefined): string | null {
  const route = value?.trim();
  if (!route) return null;
  if (route.startsWith(WORKBENCH_BFF_API_PREFIX)) return route;
  if (route.startsWith(GATEWAY_API_PREFIX)) return `/api/bff${route}`;
  return null;
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
  } else if (evidenceState === "unavailable") {
    exceptions.push({
      key: "evidence-package-unavailable",
      title: "Evidence package unavailable",
      detail: "The source could not provide a usable calculation-assurance package for this selection.",
      action: "Keep the result within internal review and obtain refreshed source evidence.",
      tone: "danger",
    });
  } else if (evidenceState !== "supported") {
    exceptions.push({
      key: "evidence-state-not-reported",
      title: "Assurance status not reported",
      detail: "The source did not publish a recognised assurance state for this selection.",
      action: "Use support details to identify the source reference before relying on the package.",
      tone: "warn",
    });
  }

  const calculations = safeArray(evidence.calculations);
  if (!calculations.length) {
    exceptions.push({
      key: "calculations-missing",
      title: "Calculation evidence not reported",
      detail: "The source did not publish any calculation evidence for this assurance package.",
      action: "Obtain the source calculation and its supporting records before relying on the package.",
      tone: "warn",
    });
  }
  calculations.forEach((calculation, index) => {
    appendLifecycleException(exceptions, calculation.execution_status, "calculation", index);
    appendLifecycleException(exceptions, calculation.lineage_status, "evidence", index);
    safeArray(calculation.stage_statuses).forEach((stage, stageIndex) => {
      appendStageLifecycleException(exceptions, stage.status, index, stageIndex);
    });
    const artifacts = safeArray(calculation.artifacts);
    if (!artifacts.length) {
      exceptions.push({
        key: `artifacts-${index}`,
        title: "Supporting records not published",
        detail: "The source did not publish a supporting record for this calculation.",
        action: "Obtain the calculation record before relying on the assurance package.",
        tone: "warn",
      });
    }
    artifacts.forEach((artifact, artifactIndex) => {
      if (buildEvidenceRecordHref(artifact.archive_document_download_url ?? artifact.url)) return;
      exceptions.push({
        key: `artifact-route-${index}-${artifactIndex}`,
        title: "Supporting record route unavailable",
        detail: "A source-published supporting record is not exposed through the Workbench evidence boundary.",
        action: "Use support details to identify the record and request a governed Gateway route before relying on it.",
        tone: "danger",
      });
    });
  });

  const inputFreshness = evidence.input_freshness ?? {};
  const inputFreshnessEntries = Object.entries(inputFreshness);
  const requiredInputKeys: Array<keyof typeof REQUIRED_INPUT_LABELS> = ["performance"];
  if (evidence.benchmark_code?.trim()) requiredInputKeys.push("benchmark");
  if (!inputFreshnessEntries.length) {
    exceptions.push({
      key: "input-freshness-missing",
      title: "Input freshness not confirmed",
      detail: "The source did not publish freshness evidence for the inputs used by this package.",
      action: "Obtain refreshed source evidence before relying on the calculation-assurance package.",
      tone: "warn",
    });
  } else {
    requiredInputKeys.forEach((key) => {
      if (Object.hasOwn(inputFreshness, key)) return;
      const label = REQUIRED_INPUT_LABELS[key];
      exceptions.push({
        key: `freshness-${key}-missing`,
        title: `${label} freshness not confirmed`,
        detail: `The source did not publish freshness evidence for the selected ${key} input.`,
        action: "Obtain refreshed source evidence before relying on the calculation-assurance package.",
        tone: "warn",
      });
    });
  }
  inputFreshnessEntries
    .filter(([key]) => requiredInputKeys.includes(key as keyof typeof REQUIRED_INPUT_LABELS))
    .forEach(([key, value]) => {
      const state = normalise(value);
      if (FRESH_STATES.includes(state)) return;
      const label =
        REQUIRED_INPUT_LABELS[key as keyof typeof REQUIRED_INPUT_LABELS] ??
        DIMENSION_LABELS[normalise(key)] ??
        "Required input";
      if (STALE_STATES.includes(state)) {
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
          detail: UNAVAILABLE_STATES.includes(state)
            ? "The source could not provide this input for the evidence package."
            : "The source did not publish a recognised freshness state for this input.",
          action: "Review the source limitation and supporting records before relying on the package.",
          tone: "warn",
        });
      }
    });

  const sourceSupportability = safeArray(evidence.source_supportability);
  if (!sourceSupportability.length) {
    exceptions.push({
      key: "source-supportability-missing",
      title: "Source supportability not confirmed",
      detail: "The package does not identify the supportability posture of its source calculation.",
      action: "Obtain source supportability evidence before relying on the package.",
      tone: "warn",
    });
  }
  sourceSupportability.forEach((item, index) => {
    const state = normalise(item.state);
    const freshness = normalise(item.freshness_bucket);
    const sourceReference = `${item.source_service || "source"}-${item.operation || item.key || "entry"}-${index}`;
    if (STALE_STATES.includes(freshness)) {
      exceptions.push({
        key: `source-supportability-${sourceReference}`,
        title: "Source calculation evidence is not current",
        detail: "A source calculation required by this evidence package is stale.",
        action: "Review the source reason in support details and obtain refreshed evidence.",
        tone: "danger",
      });
      return;
    }
    if (READY_SUPPORTABILITY_STATES.includes(state)) {
      if (!FRESH_STATES.includes(freshness)) {
        exceptions.push({
          key: `source-supportability-${sourceReference}`,
          title: "Source calculation freshness not confirmed",
          detail: "A ready source calculation does not include a recognised current freshness state.",
          action: "Review the source reason in support details and obtain current source evidence.",
          tone: "warn",
        });
      }
      return;
    }
    const actionRequired = ACTION_REQUIRED_SUPPORTABILITY_STATES.includes(state);
    exceptions.push({
      key: `source-supportability-${sourceReference}`,
      title: actionRequired ? "Source calculation unavailable" : "Source assurance qualified",
      detail:
        actionRequired
          ? "A source calculation required by this evidence package is unavailable."
          : PARTIAL_SUPPORTABILITY_STATES.includes(state)
            ? "A source calculation has qualified assurance posture."
            : "The source calculation assurance posture is not recognised.",
      action: "Review the source reason in support details and obtain refreshed evidence.",
      tone: actionRequired ? "danger" : "warn",
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

  if (!safeStrings(evidence.methodology_references).length) {
    exceptions.push({
      key: "methodology-reference-missing",
      title: "Methodology reference not confirmed",
      detail: "The source did not publish a governed methodology reference for this package.",
      action: "Obtain the applicable methodology reference before relying on the calculation evidence.",
      tone: "warn",
    });
  }

  const supportedDimensions = safeStrings(evidence.coverage?.supported_dimensions);
  const unsupportedDimensions = safeStrings(evidence.coverage?.unsupported_dimensions);
  if (!supportedDimensions.length && !unsupportedDimensions.length) {
    exceptions.push({
      key: "coverage-not-confirmed",
      title: "Evidence coverage not confirmed",
      detail: "The source did not publish the dimensional scope covered by this assurance package.",
      action: "Obtain source-confirmed coverage before applying the evidence conclusion.",
      tone: "warn",
    });
  }
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
  const failed = FAILED_STATUSES.includes(state);
  const pending = PENDING_STATUSES.includes(state);
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

function appendStageLifecycleException(
  exceptions: PerformanceEvidenceException[],
  value: string | null | undefined,
  calculationIndex: number,
  stageIndex: number
) {
  const state = normalise(value);
  if (state === COMPLETE_STATUS) return;
  const failed = FAILED_STATUSES.includes(state);
  const pending = PENDING_STATUSES.includes(state);
  exceptions.push({
    key: `calculation-stage-${calculationIndex}-${stageIndex}`,
    title: failed
      ? "Calculation stage did not complete"
      : pending
        ? "Calculation stage still in progress"
        : "Calculation stage status not reported",
    detail: failed
      ? "A source calculation stage did not complete successfully."
      : pending
        ? "A source calculation stage has not completed yet."
        : "The source published a calculation stage without a recognised completion state.",
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
    { label: "Benchmark code", value: displayValue(evidence.benchmark_code, "Not assigned") },
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

  const sourceSupportabilityRows = safeArray(evidence.source_supportability).flatMap(
    (item, index) => [
      {
        label: `Source ${index + 1}`,
        value: displayValue(item.source_service, "Not reported"),
      },
      { label: `Source ${index + 1} state`, value: displayValue(item.state) },
      {
        label: `Source ${index + 1} freshness`,
        value: displayValue(item.freshness_bucket),
      },
      { label: `Source ${index + 1} reason`, value: displayValue(item.reason) },
      {
        label: `Source ${index + 1} reference`,
        value: displayValue(item.operation || item.key),
      },
    ]
  );
  if (sourceSupportabilityRows.length) {
    groups.push({
      key: "source-supportability",
      title: "Source supportability",
      rows: sourceSupportabilityRows,
    });
  }

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
