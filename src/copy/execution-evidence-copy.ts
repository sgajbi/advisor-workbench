import {
  formatBusinessReason,
  projectBusinessState,
} from "./business-state-copy";

export const EXECUTION_EVIDENCE_COPY = Object.freeze({
  title: "Order acknowledgement evidence",
  description:
    "Source-owned order acknowledgement posture for audit and execution control.",
  evidenceLabel: "Order acknowledgement evidence",
  loadingTitle: "Checking order acknowledgement evidence",
  loadingBody: "Loading source-owned order acknowledgement records.",
  unavailableTitle: "Order acknowledgement evidence unavailable",
  notLoadedReason: "Order acknowledgement evidence has not loaded.",
  supportContext: "Contract, source posture and lineage",
});

const EXECUTION_REASON_LABELS: Readonly<Record<string, string>> = Object.freeze(
  {
    EXTERNAL_OMS_SOURCE_NOT_INGESTED:
      "External order acknowledgement records are not connected",
  },
);

const EXECUTION_EVIDENCE_LABELS: Readonly<Record<string, string>> =
  Object.freeze({
    AUTONOMOUS_EXECUTION: "Autonomous execution",
    BEST_EXECUTION: "Best-execution evidence",
    EXECUTION_STATUS_CERTIFICATION: "Execution-status certification",
    EXTERNAL_OMS_ORDER_EXECUTION_ACKNOWLEDGEMENT:
      "Order acknowledgement records",
    FILLS: "Fill evidence",
    OMS_ACKNOWLEDGEMENT: "Order-system acknowledgement",
    ORDER_GENERATION: "Order generation",
    SETTLEMENT: "Settlement evidence",
    VENUE_ROUTING: "Venue routing",
  });

const EXECUTION_LINEAGE_LABELS: Readonly<Record<string, string>> =
  Object.freeze({
    CONTRACT_VERSION: "Contract version",
    INTEGRATION_STATUS: "Integration status",
    RUNTIME_POSTURE: "Runtime posture",
    SOURCE_SYSTEM: "Source system",
    SOURCE_TABLE: "Source record",
  });

export function executionEvidenceReasonLabel(value: string): string {
  return (
    EXECUTION_REASON_LABELS[value.trim().toUpperCase()] ??
    formatBusinessReason(value)
  );
}

export function executionEvidenceItemLabel(value: string): string {
  const normalized = value.trim().toUpperCase();
  return EXECUTION_EVIDENCE_LABELS[normalized] ?? "Review required";
}

export function executionEvidenceLineageLabel(key: string): string {
  return EXECUTION_LINEAGE_LABELS[key.trim().toUpperCase()] ?? key;
}

export function executionEvidenceStateLabel(value: string): string {
  return projectBusinessState(value).label;
}
