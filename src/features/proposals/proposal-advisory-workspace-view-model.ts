import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "./types";
import {
  proposalNextAction,
  proposalStageDescription,
  proposalStageLabel,
} from "./proposal-workflow-copy";

export type ProposalTradeRow = {
  key: string;
  side: string;
  instrument: string;
  quantity: string;
};

export type ProposalReadinessItem = {
  label: string;
  state: "Ready" | "Pending" | "Blocked";
  detail: string;
};

export type ProposalAllocationImpactRow = {
  label: string;
  current: string;
  proposed: string;
};

export type ProposalAdvisoryWorkspaceModel = {
  title: string;
  portfolioLabel: string;
  versionLabel: string;
  currentStateLabel: string;
  nextAction: string;
  workflowPosture: string;
  approvalCountLabel: string;
  lineageCountLabel: string;
  latestEventLabel: string;
  generatedAtLabel: string;
  artifactHashLabel: string;
  requestHashLabel: string;
  simulationHashLabel: string;
  trades: ProposalTradeRow[];
  allocationRows: ProposalAllocationImpactRow[];
  readiness: ProposalReadinessItem[];
};

function recordValue(source: unknown): Record<string, unknown> | null {
  return source && typeof source === "object" && !Array.isArray(source)
    ? (source as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown, fallback = "Not reported"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.map(recordValue).filter((item): item is Record<string, unknown> => item !== null)
    : [];
}

function firstRecord(...candidates: unknown[]): Record<string, unknown> {
  for (const candidate of candidates) {
    const record = recordValue(candidate);
    if (record) {
      return record;
    }
  }
  return {};
}

function currentVersion(data: ProposalDetailData): Record<string, unknown> {
  return firstRecord(data.current_version);
}

function simulationRequest(data: ProposalDetailData): Record<string, unknown> {
  const version = currentVersion(data);
  const simulateRequest = firstRecord(version.simulate_request);
  return firstRecord(simulateRequest.body, simulateRequest);
}

function evidenceBundle(data: ProposalDetailData): Record<string, unknown> {
  const version = currentVersion(data);
  const artifact = firstRecord(version.artifact);
  return firstRecord(artifact.evidence_bundle, version.evidence_bundle, artifact.evidence, version.evidence);
}

function proposalTrades(data: ProposalDetailData): ProposalTradeRow[] {
  const request = simulationRequest(data);
  const trades = arrayValue(request.proposed_trades);
  return trades.map((trade, index) => ({
    key: `${stringValue(trade.instrument_id, "instrument")}-${index}`,
    side: stringValue(trade.side, "Review"),
    instrument: stringValue(trade.instrument_id, `Proposed instrument ${index + 1}`),
    quantity: stringValue(trade.quantity, "Not reported"),
  }));
}

function readinessItems(data: ProposalDetailData, approvals?: ProposalApprovalsData): ProposalReadinessItem[] {
  const evidence = evidenceBundle(data);
  const blockers = arrayValue(evidence.blockers ?? evidence.blocking_reasons ?? evidence.missing_evidence);
  const riskApproved = approvals?.approvals?.some(
    (approval) => approval.approval_type === "RISK" && approval.approved
  );
  const complianceApproved = approvals?.approvals?.some(
    (approval) => approval.approval_type === "COMPLIANCE" && approval.approved
  );
  const hasHashes = Boolean(evidence.hashes || evidence.artifact_hash || currentVersion(data).artifact_hash);

  return [
    {
      label: "Proposal Evidence",
      state: hasHashes ? "Ready" : "Pending",
      detail: hasHashes
        ? "Evidence bundle identifiers are available from Gateway."
        : "Evidence bundle identifiers were not returned by Gateway.",
    },
    {
      label: "Risk Review",
      state: riskApproved ? "Ready" : "Pending",
      detail: riskApproved ? "Risk approval is recorded." : "Risk review remains required before execution.",
    },
    {
      label: "Compliance Review",
      state: complianceApproved ? "Ready" : blockers.length > 0 ? "Blocked" : "Pending",
      detail:
        blockers.length > 0
          ? "Source evidence returned blocking issues."
          : complianceApproved
            ? "Compliance approval is recorded."
            : "Compliance review remains open.",
    },
    {
      label: "Client-Ready Release",
      state: "Blocked",
      detail: "Client-ready publication is not promoted from this Workbench surface.",
    },
  ];
}

function allocationImpactRows(data: ProposalDetailData): ProposalAllocationImpactRow[] {
  const evidence = evidenceBundle(data);
  const rows = arrayValue(evidence.allocation_comparison ?? evidence.allocation_impact);
  return rows.slice(0, 5).map((row, index) => ({
    label: stringValue(row.label ?? row.name ?? row.asset_class, `Allocation bucket ${index + 1}`),
    current: stringValue(row.current ?? row.before ?? row.current_weight, "Pending"),
    proposed: stringValue(row.proposed ?? row.after ?? row.proposed_weight, "Pending"),
  }));
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function buildProposalAdvisoryWorkspaceModel({
  data,
  workflow,
  approvals,
  lineage,
  generatedAt,
  artifactHash,
  requestHash,
  simulationHash,
}: {
  data: ProposalDetailData;
  workflow?: ProposalWorkflowEventsData;
  approvals?: ProposalApprovalsData;
  lineage?: ProposalLineageData;
  generatedAt?: string;
  artifactHash?: string;
  requestHash?: string;
  simulationHash?: string;
}): ProposalAdvisoryWorkspaceModel {
  const latestEvent = workflow?.events?.[workflow.events.length - 1];
  const approvalCount = approvals?.approvals?.length ?? 0;
  const versionCount = lineage?.versions?.length ?? 0;

  return {
    title: data.proposal.title ?? `Proposal ${data.proposal.proposal_id}`,
    portfolioLabel: data.proposal.portfolio_id ?? "Not reported",
    versionLabel: String(data.proposal.current_version_no ?? "N/A"),
    currentStateLabel: proposalStageLabel(data.proposal.current_state),
    nextAction: proposalNextAction(data.proposal.current_state),
    workflowPosture: proposalStageDescription(data.proposal.current_state),
    approvalCountLabel: `${approvalCount} recorded`,
    lineageCountLabel: versionCount ? countLabel(versionCount, "version") : "Pending",
    latestEventLabel: latestEvent ? proposalStageLabel(latestEvent.to_state) : "No events returned",
    generatedAtLabel: generatedAt ?? "Timestamp pending",
    artifactHashLabel: artifactHash ?? "Not available",
    requestHashLabel: requestHash ?? "Not available",
    simulationHashLabel: simulationHash ?? "Not available",
    trades: proposalTrades(data),
    allocationRows: allocationImpactRows(data),
    readiness: readinessItems(data, approvals),
  };
}
