import {
  buildWorkbenchUrl,
  fetchWorkbenchMutation,
  fetchWorkbenchResource,
  observeWorkbenchMutation,
  observeWorkbenchResource,
  type WorkbenchRequestTarget,
} from "@/features/workbench/api-client";
import { getDpmAiWorkflowProfile } from "@/features/workbench/dpm-ai-workflow-profiles";
import {
  resolveDefaultCallerContext,
  resolveDefaultDpmContext,
} from "@/features/workbench/caller-context";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "@/features/workbench/types";

export function buildDpmPmOperatingQualityReviewActionCorrelationId(): string {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `corr-workbench-pm-quality-review-action-${randomId}`;
}

export function buildDpmPmOperatingQualitySummaryInvocationCorrelationId(): string {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `corr-workbench-pm-quality-summary-invocation-${randomId}`;
}

function buildDpmPmOperatingQualityCallerHeaders(
  actorId?: string,
  correlationId = "corr-workbench-pm-operating-quality"
): Record<string, string> {
  const callerContext = resolveDefaultCallerContext();
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": actorId ?? callerContext.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": correlationId,
  };
}

function buildPmOperatingQualityScoreRunBody(params: {
  pmId?: string;
  bookId?: string;
  policyId?: string;
  policyVersion?: string;
  asOfDate?: string;
  actorId?: string;
  outcomeReviewIds?: string[];
}): Record<string, unknown> {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  return {
    pm_id: params.pmId ?? dpmContext.commandCenterPortfolioManagerId,
    book_id: params.bookId ?? dpmContext.commandCenterBookId,
    policy_id: params.policyId ?? "pmq_sg_dpm",
    policy_version: params.policyVersion ?? "2026.05",
    as_of_date: params.asOfDate ?? dpmContext.commandCenterAsOfDate,
    actor_id: params.actorId ?? callerContext.actorId,
    outcome_review_ids: params.outcomeReviewIds ?? [],
  };
}

export async function listDpmPmOperatingQualityPolicies(params?: {
  policyId?: string;
  enabled?: boolean;
  asOfDate?: string;
  limit?: number;
  offset?: number;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.policyId) {
    query.set("policy_id", params.policyId);
  }
  if (params?.enabled !== undefined) {
    query.set("enabled", String(params.enabled));
  }
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.policies.list",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        "server",
        "/dpm/command-center/pm-operating-quality/policies",
        "DPM PM operating quality policies",
        query
      )
  );
}

export async function getDpmPmOperatingQualityPolicy(params: {
  policyId: string;
  policyVersion: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.policies.get",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        "client",
        `/dpm/command-center/pm-operating-quality/policies/${encodeURIComponent(
          params.policyId
        )}/versions/${encodeURIComponent(params.policyVersion)}`,
        "DPM PM operating quality policy"
      )
  );
}

export async function putDpmPmOperatingQualityPolicy(params: {
  policyId: string;
  policyVersion: string;
  body: Record<string, unknown>;
  actorId?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.policies.put",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/pm-operating-quality/policies/${encodeURIComponent(
            params.policyId
          )}/versions/${encodeURIComponent(params.policyVersion)}`
        ),
        "persist DPM PM operating quality policy",
        {
          method: "PUT",
          headers: buildDpmPmOperatingQualityCallerHeaders(params.actorId),
          body: JSON.stringify({ body: params.body }),
        }
      )
  );
}

export async function listDpmPmOperatingQualityScoreRuns(params?: {
  pmId?: string;
  bookId?: string;
  policyId?: string;
  asOfDate?: string;
  state?: string;
  limit?: number;
  offset?: number;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("book_id", params?.bookId ?? dpmContext.commandCenterBookId);
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.pmId) {
    query.set("pm_id", params.pmId);
  }
  if (params?.policyId) {
    query.set("policy_id", params.policyId);
  }
  if (params?.state) {
    query.set("state", params.state);
  }
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.score-runs.list",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        "server",
        "/dpm/command-center/pm-operating-quality/score-runs",
        "DPM PM operating quality score runs",
        query
      )
  );
}

export async function getDpmPmOperatingQualityScoreRun(
  scoreRunId: string
): Promise<DpmPmOperatingQualityGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.score-runs.get",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        "client",
        `/dpm/command-center/pm-operating-quality/score-runs/${encodeURIComponent(scoreRunId)}`,
        "DPM PM operating quality score run"
      )
  );
}

export async function previewDpmPmOperatingQualityScoreRun(params: {
  pmId?: string;
  bookId?: string;
  policyId?: string;
  policyVersion?: string;
  asOfDate?: string;
  actorId?: string;
  outcomeReviewIds?: string[];
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const body = buildPmOperatingQualityScoreRunBody(params);
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.score-runs.preview",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/pm-operating-quality/score-runs/preview"),
        "preview DPM PM operating quality score run",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(params.actorId),
          body: JSON.stringify({ body }),
        }
      )
  );
}

export async function createDpmPmOperatingQualityScoreRun(params: {
  pmId?: string;
  bookId?: string;
  policyId?: string;
  policyVersion?: string;
  asOfDate?: string;
  actorId?: string;
  outcomeReviewIds?: string[];
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const body = buildPmOperatingQualityScoreRunBody(params);
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.score-runs.create",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/pm-operating-quality/score-runs"),
        "create DPM PM operating quality score run",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(params.actorId),
          body: JSON.stringify({ body }),
        }
      )
  );
}

export async function requestDpmPmOperatingQualitySummary(params: {
  scoreRunId: string;
  requestedOutputs?: string[];
  audience?: string[];
  actorId?: string;
}): Promise<DpmPmOperatingQualitySummaryResponse> {
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.score-runs.ai-summary",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualitySummaryResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/pm-operating-quality/score-runs/${encodeURIComponent(
            params.scoreRunId
          )}/ai-summary`
        ),
        "request DPM PM operating quality support summary",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(params.actorId),
          body: JSON.stringify({
            requested_outputs:
              params.requestedOutputs ??
              getDpmAiWorkflowProfile("pm-quality-summary").requestedOutputs,
            audience: params.audience ?? [
              "portfolio_manager",
              "investment_control",
              "cio_office",
            ],
          }),
        }
      )
  );
}

export type DpmPmOperatingQualityFairnessSegmentRequest = {
  segment_id: string;
  segment_type: string;
  display_name: string;
  score_run_ids: string[];
  source_refs?: Array<Record<string, unknown>>;
};

function buildPmOperatingQualityFairnessAnalysisBody(params: {
  policyId: string;
  policyVersion: string;
  asOfDate?: string;
  actorId?: string;
  segments: DpmPmOperatingQualityFairnessSegmentRequest[];
  minimumSegmentScoreRunCount?: number;
  maximumAverageScoreSpread?: string;
}): Record<string, unknown> {
  const dpmContext = resolveDefaultDpmContext();
  const body: Record<string, unknown> = {
    policy_id: params.policyId,
    policy_version: params.policyVersion,
    as_of_date: params.asOfDate ?? dpmContext.commandCenterAsOfDate,
    actor_id: params.actorId ?? "workbench-pm-operating-quality-operator",
    segments: params.segments,
  };
  if (typeof params.minimumSegmentScoreRunCount === "number") {
    body.minimum_segment_score_run_count = params.minimumSegmentScoreRunCount;
  }
  if (params.maximumAverageScoreSpread) {
    body.maximum_average_score_spread = params.maximumAverageScoreSpread;
  }
  return body;
}

export async function previewDpmPmOperatingQualityFairnessAnalysis(params: {
  policyId: string;
  policyVersion: string;
  asOfDate?: string;
  actorId?: string;
  segments: DpmPmOperatingQualityFairnessSegmentRequest[];
  minimumSegmentScoreRunCount?: number;
  maximumAverageScoreSpread?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const body = buildPmOperatingQualityFairnessAnalysisBody(params);
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.fairness-analyses.preview",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          "/dpm/command-center/pm-operating-quality/fairness-analyses/preview"
        ),
        "preview DPM PM operating quality fairness analysis",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(params.actorId),
          body: JSON.stringify({ body }),
        }
      )
  );
}

export async function createDpmPmOperatingQualityFairnessAnalysis(params: {
  policyId: string;
  policyVersion: string;
  asOfDate?: string;
  actorId?: string;
  segments: DpmPmOperatingQualityFairnessSegmentRequest[];
  minimumSegmentScoreRunCount?: number;
  maximumAverageScoreSpread?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const body = buildPmOperatingQualityFairnessAnalysisBody(params);
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.fairness-analyses.create",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/pm-operating-quality/fairness-analyses"),
        "create DPM PM operating quality fairness analysis",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(params.actorId),
          body: JSON.stringify({ body }),
        }
      )
  );
}

export async function listDpmPmOperatingQualityFairnessAnalyses(params?: {
  policyId?: string;
  policyVersion?: string;
  asOfDate?: string;
  state?: string;
  limit?: number;
  offset?: number;
}, target: WorkbenchRequestTarget = "server"): Promise<DpmPmOperatingQualityGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.policyId) {
    query.set("policy_id", params.policyId);
  }
  if (params?.policyVersion) {
    query.set("policy_version", params.policyVersion);
  }
  if (params?.state) {
    query.set("state", params.state);
  }
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.fairness-analyses.list",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        target,
        "/dpm/command-center/pm-operating-quality/fairness-analyses",
        "DPM PM operating quality fairness analyses",
        query
      )
  );
}

export async function getDpmPmOperatingQualityFairnessAnalysis(
  fairnessAnalysisId: string,
  target: WorkbenchRequestTarget = "server"
): Promise<DpmPmOperatingQualityGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.fairness-analyses.get",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        target,
        `/dpm/command-center/pm-operating-quality/fairness-analyses/${encodeURIComponent(
          fairnessAnalysisId
        )}`,
        "DPM PM operating quality fairness analysis"
      )
  );
}

export async function listDpmPmOperatingQualityReviewActions(params?: {
  targetType?: string;
  targetId?: string;
  policyId?: string;
  actionState?: string;
  asOfDate?: string;
  limit?: number;
  offset?: number;
}, target: WorkbenchRequestTarget = "server"): Promise<DpmPmOperatingQualityGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.targetType) {
    query.set("target_type", params.targetType);
  }
  if (params?.targetId) {
    query.set("target_id", params.targetId);
  }
  if (params?.policyId) {
    query.set("policy_id", params.policyId);
  }
  if (params?.actionState) {
    query.set("action_state", params.actionState);
  }
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.review-actions.list",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        target,
        "/dpm/command-center/pm-operating-quality/review-actions",
        "DPM PM operating quality review actions",
        query
      )
  );
}

export async function getDpmPmOperatingQualityReviewAction(
  reviewActionId: string,
  target: WorkbenchRequestTarget = "server"
): Promise<DpmPmOperatingQualityGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.review-actions.get",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        target,
        `/dpm/command-center/pm-operating-quality/review-actions/${encodeURIComponent(
          reviewActionId
        )}`,
        "DPM PM operating quality review action"
      )
  );
}

export type DpmPmOperatingQualityReviewActionRequest = {
  target_type: string;
  target_id: string;
  action_type: string;
  action_state?: string;
  review_action_ref: string;
  review_reason: string;
  actor_id: string;
  policy_id?: string;
  policy_version?: string;
  as_of_date?: string;
  source_refs?: Array<Record<string, unknown>>;
};

export async function previewDpmPmOperatingQualityReviewAction(params: {
  request: DpmPmOperatingQualityReviewActionRequest;
  actorId?: string;
  correlationId?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const correlationId =
    params.correlationId ?? buildDpmPmOperatingQualityReviewActionCorrelationId();
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.review-actions.preview",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          "/dpm/command-center/pm-operating-quality/review-actions/preview"
        ),
        "preview DPM PM operating quality review action",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(
            params.actorId ?? params.request.actor_id,
            correlationId
          ),
          body: JSON.stringify({ body: params.request }),
        }
      )
  );
}

export async function createDpmPmOperatingQualityReviewAction(params: {
  request: DpmPmOperatingQualityReviewActionRequest;
  actorId?: string;
  correlationId?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const correlationId =
    params.correlationId ?? buildDpmPmOperatingQualityReviewActionCorrelationId();
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.review-actions.create",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/pm-operating-quality/review-actions"),
        "create DPM PM operating quality review action",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(
            params.actorId ?? params.request.actor_id,
            correlationId
          ),
          body: JSON.stringify({ body: params.request }),
        }
      )
  );
}

export type DpmPmOperatingQualitySummaryInvocationRequest = {
  score_run_id: string;
  review_action_id: string;
  invocation_state?: string;
  summary_ref: string;
  workflow_pack_name?: string;
  workflow_pack_version?: string;
  workflow_run_id?: string;
  summary_artifact_ref?: string;
  summary_content_hash?: string;
  requested_by: string;
  source_refs?: Array<Record<string, unknown>>;
};

export async function previewDpmPmOperatingQualitySummaryInvocation(params: {
  request: DpmPmOperatingQualitySummaryInvocationRequest;
  actorId?: string;
  correlationId?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const correlationId =
    params.correlationId ?? buildDpmPmOperatingQualitySummaryInvocationCorrelationId();
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.summary-invocations.preview",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          "/dpm/command-center/pm-operating-quality/summary-invocations/preview"
        ),
        "preview DPM PM operating quality summary invocation",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(
            params.actorId ?? params.request.requested_by,
            correlationId
          ),
          body: JSON.stringify({ body: params.request }),
        }
      )
  );
}

export async function createDpmPmOperatingQualitySummaryInvocation(params: {
  request: DpmPmOperatingQualitySummaryInvocationRequest;
  actorId?: string;
  correlationId?: string;
}): Promise<DpmPmOperatingQualityGatewayResponse> {
  const correlationId =
    params.correlationId ?? buildDpmPmOperatingQualitySummaryInvocationCorrelationId();
  return await observeWorkbenchMutation(
    "dpm.pm-operating-quality.summary-invocations.create",
    async () =>
      await fetchWorkbenchMutation<DpmPmOperatingQualityGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/pm-operating-quality/summary-invocations"),
        "create DPM PM operating quality summary invocation",
        {
          method: "POST",
          headers: buildDpmPmOperatingQualityCallerHeaders(
            params.actorId ?? params.request.requested_by,
            correlationId
          ),
          body: JSON.stringify({ body: params.request }),
        }
      )
  );
}

export async function listDpmPmOperatingQualitySummaryInvocations(params?: {
  scoreRunId?: string;
  reviewActionId?: string;
  policyId?: string;
  invocationState?: string;
  asOfDate?: string;
  limit?: number;
  offset?: number;
}, target: WorkbenchRequestTarget = "server"): Promise<DpmPmOperatingQualityGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 10));
  query.set("offset", String(params?.offset ?? 0));
  if (params?.scoreRunId) {
    query.set("score_run_id", params.scoreRunId);
  }
  if (params?.reviewActionId) {
    query.set("review_action_id", params.reviewActionId);
  }
  if (params?.policyId) {
    query.set("policy_id", params.policyId);
  }
  if (params?.invocationState) {
    query.set("invocation_state", params.invocationState);
  }
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.summary-invocations.list",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        target,
        "/dpm/command-center/pm-operating-quality/summary-invocations",
        "DPM PM operating quality summary invocations",
        query
      )
  );
}

export async function getDpmPmOperatingQualitySummaryInvocation(
  summaryInvocationId: string,
  target: WorkbenchRequestTarget = "server"
): Promise<DpmPmOperatingQualityGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.pm-operating-quality.summary-invocations.get",
    async () =>
      await fetchWorkbenchResource<DpmPmOperatingQualityGatewayResponse>(
        target,
        `/dpm/command-center/pm-operating-quality/summary-invocations/${encodeURIComponent(
          summaryInvocationId
        )}`,
        "DPM PM operating quality summary invocation"
      )
  );
}
