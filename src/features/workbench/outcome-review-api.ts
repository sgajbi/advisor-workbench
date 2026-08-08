import {
  buildWorkbenchUrl,
  fetchWorkbenchMutation,
  fetchWorkbenchResource,
  observeWorkbenchMutation,
  observeWorkbenchResource,
} from "@/features/workbench/api-client";
import { getDpmAiWorkflowProfile } from "@/features/workbench/dpm-ai-workflow-profiles";
import { buildReportingCallerHeaders } from "@/features/workbench/reporting-caller-headers";
import type {
  DpmOutcomeReviewGatewayResponse,
  DpmOutcomeReviewHandoffResponse,
  DpmOutcomeReviewNarrativeResponse,
  ReportJobHandleResponse,
} from "@/features/workbench/types";

export async function getDpmOutcomeReviews(params: {
  portfolioId: string;
  state?: string;
  sourceSystem?: string;
  sourceType?: string;
  sourceScanLimit?: number;
  limit?: number;
  offset?: number;
  cursor?: string;
}): Promise<DpmOutcomeReviewGatewayResponse> {
  const query = new URLSearchParams();
  query.set("portfolio_id", params.portfolioId);
  query.set("limit", String(params.limit ?? 10));
  if (params.state) {
    query.set("state", params.state);
  }
  if (params.sourceSystem) {
    query.set("source_system", params.sourceSystem);
  }
  if (params.sourceType) {
    query.set("source_type", params.sourceType);
  }
  if (typeof params.sourceScanLimit === "number") {
    query.set("source_scan_limit", String(params.sourceScanLimit));
  }
  if (typeof params.offset === "number") {
    query.set("offset", String(params.offset));
  }
  if (params.cursor) {
    query.set("cursor", params.cursor);
  }
  return await observeWorkbenchResource(
    "dpm.outcome-reviews.list",
    async () =>
      await fetchWorkbenchResource<DpmOutcomeReviewGatewayResponse>(
        "server",
        "/dpm/command-center/outcome-reviews",
        "DPM outcome reviews",
        query
      )
  );
}

export async function getDpmOutcomeReviewReportInput(
  outcomeReviewId: string
): Promise<DpmOutcomeReviewHandoffResponse> {
  return await observeWorkbenchResource(
    "dpm.outcome-review.report-input",
    async () =>
      await fetchWorkbenchResource<DpmOutcomeReviewHandoffResponse>(
        "client",
        `/dpm/command-center/outcome-reviews/${encodeURIComponent(outcomeReviewId)}/report-input`,
        "DPM outcome review report input"
      )
  );
}

export async function getDpmOutcomeReviewAiEvidenceInput(
  outcomeReviewId: string
): Promise<DpmOutcomeReviewHandoffResponse> {
  return await observeWorkbenchResource(
    "dpm.outcome-review.ai-evidence",
    async () =>
      await fetchWorkbenchResource<DpmOutcomeReviewHandoffResponse>(
        "client",
        `/dpm/command-center/outcome-reviews/${encodeURIComponent(outcomeReviewId)}/ai-evidence-input`,
        "DPM outcome review AI evidence input"
      )
  );
}

export async function requestDpmOutcomeReviewAiNarrative(params: {
  outcomeReviewId: string;
  requestedOutputs?: string[];
  audience?: string[];
}): Promise<DpmOutcomeReviewNarrativeResponse> {
  return await observeWorkbenchMutation(
    "dpm.outcome-review.ai-narrative",
    async () =>
      await fetchWorkbenchMutation<DpmOutcomeReviewNarrativeResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/outcome-reviews/${encodeURIComponent(params.outcomeReviewId)}/ai-narrative`
        ),
        "request DPM outcome review AI narrative",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Correlation-Id": `corr-workbench-outcome-ai-${params.outcomeReviewId}`,
          },
          body: JSON.stringify({
            requested_outputs:
              params.requestedOutputs ??
              getDpmAiWorkflowProfile("outcome-narrative").requestedOutputs,
            audience: params.audience ?? [
              "portfolio_manager",
              "cio_office",
              "investment_control",
            ],
          }),
        }
      )
  );
}

export async function submitDpmOutcomeReviewReportJob(params: {
  outcomeReviewId: string;
  outcomeReportInput: Record<string, unknown>;
  requestedOutputFormats?: string[];
  tenantId?: string;
  region?: string;
  bookingCenterCode?: string | null;
  actorId?: string;
}): Promise<ReportJobHandleResponse> {
  const tenantId = params.tenantId ?? "tenant-sg";
  const region = params.region ?? "APAC";
  const actorId = params.actorId ?? "workbench-outcome-review-operator";
  const idempotencyKey = `outcome-review-${params.outcomeReviewId}-pdf`;
  return await observeWorkbenchMutation(
    "dpm.outcome-review.report-job.submit",
    async () =>
      await fetchWorkbenchMutation<ReportJobHandleResponse>(
        buildWorkbenchUrl("client", "/reports/outcome-reviews"),
        "submit outcome-review report job",
        {
          method: "POST",
          headers: {
            ...buildReportingCallerHeaders({
              actorId,
              tenantId,
              region,
              bookingCenterCode: params.bookingCenterCode,
              correlationId: `corr-workbench-outcome-report-${params.outcomeReviewId}`,
            }),
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            outcome_report_input: params.outcomeReportInput,
            requested_output_formats: params.requestedOutputFormats ?? ["pdf"],
            options: { retention_policy_id: "generated-report-standard" },
          }),
        }
      )
  );
}
