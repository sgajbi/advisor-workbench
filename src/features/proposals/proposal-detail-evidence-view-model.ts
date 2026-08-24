import { formatTimestampValue } from "@/design-system/utils/financial-formatters";

import type {
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "./types";
import { proposalStageOrder } from "./proposal-workflow-copy";

export type ProposalDetailStageItem = {
  label: string;
  reached: boolean;
};

export type ProposalDetailEvidenceModel = {
  artifactHash?: string;
  requestHash?: string;
  simulationHash?: string;
  generatedAt?: string;
  stageItems: ProposalDetailStageItem[];
  visibleWorkflowEvents: NonNullable<ProposalWorkflowEventsData["events"]>;
  hiddenWorkflowEventCount: number;
  lineageVersions: NonNullable<ProposalLineageData["versions"]>;
};

function recordValue(source: unknown): Record<string, unknown> | null {
  return source && typeof source === "object" && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : null;
}

export function buildProposalDetailEvidenceModel({
  data,
  workflow,
  lineage,
}: {
  data: ProposalDetailData;
  workflow?: ProposalWorkflowEventsData;
  lineage?: ProposalLineageData;
}): ProposalDetailEvidenceModel {
  const currentVersion = recordValue(data.current_version) ?? {};
  const artifact = recordValue(currentVersion.artifact) ?? {};
  const evidence =
    recordValue(artifact.evidence_bundle) ?? recordValue(currentVersion.evidence_bundle) ?? null;
  const evidenceHashes = recordValue(evidence?.hashes) ?? recordValue(currentVersion.hashes) ?? {};
  const artifactHash =
    typeof currentVersion.artifact_hash === "string"
      ? currentVersion.artifact_hash
      : typeof evidenceHashes.artifact_hash === "string"
        ? evidenceHashes.artifact_hash
        : undefined;
  const requestHash =
    typeof evidenceHashes.request_hash === "string" ? evidenceHashes.request_hash : undefined;
  const simulationHash =
    typeof evidenceHashes.simulation_hash === "string"
      ? evidenceHashes.simulation_hash
      : undefined;
  const sourceGeneratedAt =
    typeof artifact.generated_at === "string"
      ? artifact.generated_at
      : typeof currentVersion.created_at === "string"
        ? currentVersion.created_at
        : typeof evidence?.generated_at === "string"
          ? evidence.generated_at
          : undefined;
  const generatedAt = sourceGeneratedAt
    ? formatTimestampValue(sourceGeneratedAt, { nullDisplay: "Not reported" })
    : undefined;
  const workflowStage = proposalStageOrder(data.proposal.current_state);
  const visibleWorkflowEvents = workflow?.events?.slice(0, 8) ?? [];

  return {
    artifactHash,
    requestHash,
    simulationHash,
    generatedAt,
    stageItems: [
      { label: "Draft", reached: workflowStage >= 1 },
      { label: "Review", reached: workflowStage >= 2 },
      { label: "Client Consent", reached: workflowStage >= 3 },
      { label: "Execution Ready", reached: workflowStage >= 4 },
    ],
    visibleWorkflowEvents,
    hiddenWorkflowEventCount: Math.max((workflow?.events?.length ?? 0) - visibleWorkflowEvents.length, 0),
    lineageVersions: lineage?.versions ?? [],
  };
}
