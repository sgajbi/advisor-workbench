import {
  buildWorkbenchUrl,
  fetchWorkbenchMutation,
  fetchWorkbenchResource,
  observeWorkbenchMutation,
  observeWorkbenchResource,
  type WorkbenchRequestTarget,
} from "@/features/workbench/api-client";
import type {
  DpmProofPackAiPmMemoResponse,
  DpmProofPackGatewayResponse,
  DpmProofPackMarkdownResponse,
} from "@/features/workbench/types";

function buildDpmProofPackCallerHeaders(params: {
  actorId: string;
  correlationId: string;
}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": params.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": params.correlationId,
  };
}

export async function generateDpmProofPackFromRun(params: {
  rebalanceRunId: string;
  mandateId?: string | null;
  actorId?: string;
  reason?: string;
  includeMarkdown?: boolean;
  includeReportInput?: boolean;
  includeAiEvidenceInput?: boolean;
}): Promise<DpmProofPackGatewayResponse> {
  const actorId = params.actorId ?? "workbench-proof-pack-operator";
  return await observeWorkbenchMutation(
    "dpm.proof-pack.generate",
    async () =>
      await fetchWorkbenchMutation<DpmProofPackGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/proof-packs"),
        "generate DPM proof pack",
        {
          method: "POST",
          headers: buildDpmProofPackCallerHeaders({
            actorId,
            correlationId: `corr-workbench-proof-pack-${params.rebalanceRunId}`,
          }),
          body: JSON.stringify({
            idempotency_key: `workbench-proof-pack-${params.rebalanceRunId}`,
            body: {
              source_type: "REBALANCE_RUN",
              rebalance_run_id: params.rebalanceRunId,
              mandate_id: params.mandateId ?? undefined,
              include_markdown: params.includeMarkdown ?? true,
              include_report_input: params.includeReportInput ?? true,
              include_ai_evidence_input: params.includeAiEvidenceInput ?? true,
              actor_id: actorId,
              reason:
                params.reason ??
                "Workbench PM generated proof pack from Gateway-backed rebalance run.",
            },
          }),
        }
      )
  );
}

export async function getDpmProofPack(
  proofPackId: string,
  target: WorkbenchRequestTarget = "client"
): Promise<DpmProofPackGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.get",
    async () =>
      await fetchWorkbenchResource<DpmProofPackGatewayResponse>(
        target,
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}`,
        "DPM proof pack"
      )
  );
}

export async function getDpmProofPackMarkdown(
  proofPackId: string
): Promise<DpmProofPackMarkdownResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.markdown",
    async () =>
      await fetchWorkbenchResource<DpmProofPackMarkdownResponse>(
        "client",
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/summary.md`,
        "DPM proof pack Markdown"
      )
  );
}

export async function getDpmProofPackReportInput(
  proofPackId: string
): Promise<DpmProofPackGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.report-input",
    async () =>
      await fetchWorkbenchResource<DpmProofPackGatewayResponse>(
        "client",
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/report-input`,
        "DPM proof pack report input"
      )
  );
}

export async function getDpmProofPackAiEvidenceInput(
  proofPackId: string
): Promise<DpmProofPackGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.proof-pack.ai-evidence",
    async () =>
      await fetchWorkbenchResource<DpmProofPackGatewayResponse>(
        "client",
        `/dpm/command-center/proof-packs/${encodeURIComponent(proofPackId)}/ai-evidence-input`,
        "DPM proof pack AI evidence input"
      )
  );
}

export async function requestDpmProofPackAiPmMemo(params: {
  proofPackId: string;
  requestedOutputs?: string[];
  audience?: string[];
}): Promise<DpmProofPackAiPmMemoResponse> {
  return await observeWorkbenchMutation(
    "dpm.proof-pack.ai-pm-memo",
    async () =>
      await fetchWorkbenchMutation<DpmProofPackAiPmMemoResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/proof-packs/${encodeURIComponent(params.proofPackId)}/ai-pm-memo`
        ),
        "request DPM proof-pack AI PM memo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": `corr-workbench-proof-pack-ai-memo-${params.proofPackId}`,
          },
          body: JSON.stringify({
            requested_outputs: params.requestedOutputs ?? [
              "pm_memo",
              "rationale_summary",
              "approval_checklist",
              "risk_caveats",
              "operations_handoff",
              "evidence_gaps",
            ],
            audience: params.audience ?? [
              "portfolio_manager",
              "investment_control",
              "operations",
            ],
          }),
        }
      )
  );
}
