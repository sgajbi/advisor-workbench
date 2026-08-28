import { buildAnalyticsUiCorrelationHeaders } from "@/features/analytics-observability/correlation";
import {
  buildWorkbenchUrl,
  fetchWorkbenchJson,
  fetchWorkbenchMutation,
  fetchWorkbenchResource,
  observeWorkbenchMutation,
  observeWorkbenchResource,
} from "@/features/workbench/api-client";
import {
  resolveDefaultCallerContext,
  resolveDefaultDpmContext,
} from "@/features/workbench/caller-context";
import type {
  DpmConstructionGatewayResponse,
  ExternalOrderExecutionAcknowledgementResponse,
  WorkbenchPortfolio360,
} from "@/features/workbench/types";

function buildUniqueMutationToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildConstructionGenerationIdempotencyKey(params: {
  portfolioId: string;
  constructionAsOf: string;
  mutationToken: string;
}): string {
  return [
    "workbench-construction",
    params.portfolioId,
    params.constructionAsOf,
    params.mutationToken,
  ].join("-");
}

function buildDpmConstructionCallerHeaders(params: {
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

function buildConstructionAlternativeSetRequest(
  portfolio: WorkbenchPortfolio360,
): Record<string, unknown> {
  const portfolioId = portfolio.portfolio.portfolio_id;
  const callerContext = resolveDefaultCallerContext();
  const dpmContext = resolveDefaultDpmContext();
  const sourceAsOfDate = dpmContext.sourceAsOfDate || portfolio.as_of_date;
  return {
    input_mode: "stateful",
    stateful_input: {
      portfolio_id: portfolioId,
      as_of: sourceAsOfDate,
      mandate_id: dpmContext.mandateId,
      model_portfolio_id: dpmContext.modelPortfolioId,
      tenant_id: callerContext.tenantId,
      booking_center_code:
        dpmContext.bookingCenterCode ||
        portfolio.portfolio.booking_center_code ||
        callerContext.bookingCenterCode,
      include_tax_lots: true,
      include_settlement_profile: true,
      include_shelf: true,
      include_model_portfolio: true,
    },
  };
}

export async function generateDpmConstructionAlternatives(params: {
  portfolio: WorkbenchPortfolio360;
  actorId?: string;
  idempotencyKey?: string;
}): Promise<DpmConstructionGatewayResponse> {
  const portfolioId = params.portfolio.portfolio.portfolio_id;
  const actorId = params.actorId ?? "workbench-construction-operator";
  const requestBody = buildConstructionAlternativeSetRequest(params.portfolio);
  const statefulInput = requestBody.stateful_input as
    | { as_of?: unknown }
    | undefined;
  const constructionAsOf =
    typeof statefulInput?.as_of === "string"
      ? statefulInput.as_of
      : params.portfolio.as_of_date;
  const mutationToken = buildUniqueMutationToken();
  const idempotencyKey =
    params.idempotencyKey ??
    buildConstructionGenerationIdempotencyKey({
      portfolioId,
      constructionAsOf,
      mutationToken,
    });
  const correlationId = [
    "corr-workbench-construction",
    portfolioId,
    constructionAsOf,
    mutationToken,
  ].join("-");
  return await observeWorkbenchMutation(
    "dpm.construction.alternatives.generate",
    async () =>
      await fetchWorkbenchMutation<DpmConstructionGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/construction/alternative-sets/generate"),
        "generate DPM construction alternatives",
        {
          method: "POST",
          headers: buildDpmConstructionCallerHeaders({
            actorId,
            correlationId,
          }),
          body: JSON.stringify({
            idempotency_key: idempotencyKey,
            body: requestBody,
          }),
        }
      )
  );
}

export async function getDpmConstructionAlternativeSet(
  alternativeSetId: string
): Promise<DpmConstructionGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.construction.alternative-set.get",
    async () =>
      await fetchWorkbenchResource<DpmConstructionGatewayResponse>(
        "client",
        `/dpm/command-center/construction/alternative-sets/${encodeURIComponent(alternativeSetId)}`,
        "DPM construction alternative set"
      )
  );
}

export async function selectDpmConstructionAlternative(params: {
  alternativeSetId: string;
  alternativeId: string;
  actorId?: string;
  reasonCode?: string;
  comment?: string;
}): Promise<DpmConstructionGatewayResponse> {
  const actorId = params.actorId ?? "workbench-construction-operator";
  return await observeWorkbenchMutation(
    "dpm.construction.alternative.select",
    async () =>
      await fetchWorkbenchMutation<DpmConstructionGatewayResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/construction/alternative-sets/${encodeURIComponent(params.alternativeSetId)}/selections`
        ),
        "select DPM construction alternative",
        {
          method: "POST",
          headers: buildDpmConstructionCallerHeaders({
            actorId,
            correlationId: `corr-workbench-construction-select-${params.alternativeSetId}`,
          }),
          body: JSON.stringify({
            body: {
              alternative_id: params.alternativeId,
              actor_id: actorId,
              reason_code: params.reasonCode ?? "PM_SELECTED_WORKBENCH_CONSTRUCTION_ALTERNATIVE",
              comment: params.comment ?? "Selected from Workbench construction lab.",
            },
          }),
        }
      )
  );
}

export async function getExternalOrderExecutionAcknowledgement(params: {
  portfolio: WorkbenchPortfolio360;
  executionIntentId?: string;
  orderReferenceIds?: string[];
}): Promise<ExternalOrderExecutionAcknowledgementResponse> {
  const portfolioId = params.portfolio.portfolio.portfolio_id;
  const callerContext = resolveDefaultCallerContext();
  const dpmContext = resolveDefaultDpmContext();
  const body: Record<string, unknown> = {
    as_of_date: params.portfolio.as_of_date,
    tenant_id: callerContext.tenantId,
    mandate_id: dpmContext.mandateId,
    order_reference_ids: params.orderReferenceIds ?? [],
  };
  if (params.executionIntentId) {
    body.execution_intent_id = params.executionIntentId;
  }

  return await observeWorkbenchResource(
    "source-products.external-order-execution-acknowledgement.get",
    async () =>
      await fetchWorkbenchJson<ExternalOrderExecutionAcknowledgementResponse>(
        buildWorkbenchUrl(
          "client",
          `/source-products/portfolios/${encodeURIComponent(portfolioId)}/external-order-execution-acknowledgement`
        ),
        "external OMS acknowledgement supportability",
        {
          method: "POST",
          headers: buildAnalyticsUiCorrelationHeaders({
            "Content-Type": "application/json",
            "X-Correlation-Id": `corr-workbench-execution-acknowledgement-${portfolioId}`,
          }),
          body: JSON.stringify(body),
        }
      )
  );
}
