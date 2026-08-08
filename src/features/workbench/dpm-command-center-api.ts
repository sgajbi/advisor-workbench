import {
  buildWorkbenchUrl,
  fetchWorkbenchMutation,
  fetchWorkbenchResource,
  observeWorkbenchMutation,
  observeWorkbenchResource,
} from "@/features/workbench/api-client";
import { getDpmAiWorkflowProfile } from "@/features/workbench/dpm-ai-workflow-profiles";
import {
  resolveDefaultCallerContext,
  resolveDefaultDpmContext,
} from "@/features/workbench/caller-context";
import type {
  DpmCommandCenterGatewayResponse,
  DpmExceptionSummaryResponse,
  DpmPortfolioMemoryGatewayResponse,
} from "@/features/workbench/types";

function buildDpmCommandCenterCallerHeaders(params: {
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

function buildDpmWaveCallerHeaders(actorId?: string): Record<string, string> {
  const callerContext = resolveDefaultCallerContext();
  return {
    "Content-Type": "application/json",
    "X-Actor-Id": actorId ?? callerContext.actorId,
    "X-Caller-Application": "lotus-workbench",
    "X-Correlation-Id": "corr-workbench-dpm-wave",
  };
}

export async function getDpmCommandCenter(params?: {
  tenantId?: string;
  portfolioManagerId?: string;
  bookId?: string;
  asOfDate?: string;
  healthState?: string;
  limit?: number;
}): Promise<DpmCommandCenterGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("tenant_id", params?.tenantId ?? dpmContext.commandCenterTenantId);
  query.set(
    "portfolio_manager_id",
    params?.portfolioManagerId ?? dpmContext.commandCenterPortfolioManagerId
  );
  query.set("book_id", params?.bookId ?? dpmContext.commandCenterBookId);
  query.set("as_of_date", params?.asOfDate ?? dpmContext.commandCenterAsOfDate);
  query.set("limit", String(params?.limit ?? 25));
  if (params?.healthState) {
    query.set("health_state", params.healthState);
  }
  return await observeWorkbenchResource(
    "dpm.command-center.summary",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        "/dpm/command-center",
        "DPM command center",
        query
      )
  );
}

export async function runDpmCommandCenterMonitoring(params?: {
  mandateIds?: string[];
  tenantId?: string;
  portfolioManagerId?: string;
  bookId?: string;
  asOfDate?: string;
  requestedBy?: string;
}): Promise<DpmCommandCenterGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const callerContext = resolveDefaultCallerContext();
  const mandateIds = params?.mandateIds ?? [];
  const asOfDate = params?.asOfDate ?? dpmContext.commandCenterAsOfDate;
  return await observeWorkbenchMutation(
    "dpm.command-center.monitoring.run-once",
    async () =>
      await fetchWorkbenchMutation<DpmCommandCenterGatewayResponse>(
        buildWorkbenchUrl("client", "/dpm/command-center/monitoring/run-once"),
        "run DPM command-center monitoring",
        {
          method: "POST",
          headers: buildDpmCommandCenterCallerHeaders({
            actorId: params?.requestedBy ?? callerContext.actorId,
            correlationId: `corr-workbench-command-center-run-${asOfDate}`,
          }),
          body: JSON.stringify({
            body: {
              mandate_ids: mandateIds,
              as_of_date: asOfDate,
              tenant_id: params?.tenantId ?? dpmContext.commandCenterTenantId,
              portfolio_manager_id:
                params?.portfolioManagerId ??
                dpmContext.commandCenterPortfolioManagerId,
              book_id: params?.bookId ?? dpmContext.commandCenterBookId,
              requested_by: params?.requestedBy ?? callerContext.actorId,
            },
          }),
        }
      )
  );
}

export async function getDpmCommandCenterExceptions(params?: {
  tenantId?: string;
  portfolioManagerId?: string;
  monitoringRunId?: string;
  state?: string;
  severity?: string;
  limit?: number;
}): Promise<DpmCommandCenterGatewayResponse> {
  const dpmContext = resolveDefaultDpmContext();
  const query = new URLSearchParams();
  query.set("tenant_id", params?.tenantId ?? dpmContext.commandCenterTenantId);
  query.set(
    "portfolio_manager_id",
    params?.portfolioManagerId ?? dpmContext.commandCenterPortfolioManagerId
  );
  query.set("limit", String(params?.limit ?? 25));
  if (params?.monitoringRunId) {
    query.set("monitoring_run_id", params.monitoringRunId);
  }
  if (params?.state) {
    query.set("state", params.state);
  }
  if (params?.severity) {
    query.set("severity", params.severity);
  }
  return await observeWorkbenchResource(
    "dpm.command-center.exceptions.list",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        "/dpm/command-center/exceptions",
        "DPM command-center exceptions",
        query
      )
  );
}

export async function requestDpmExceptionSummary(params: {
  exceptionId: string;
  portfolioId?: string;
  mandateId?: string;
  state?: string;
}): Promise<DpmExceptionSummaryResponse> {
  const body: Record<string, unknown> = {
    requested_outputs:
      getDpmAiWorkflowProfile("exception-summary").requestedOutputs,
    audience: ["portfolio_manager", "investment_control", "operations"],
  };
  if (params.portfolioId) {
    body.portfolio_id = params.portfolioId;
  }
  if (params.mandateId) {
    body.mandate_id = params.mandateId;
  }
  if (params.state) {
    body.state = params.state;
  }

  return await observeWorkbenchMutation(
    "dpm.command-center.exceptions.ai-summary",
    async () =>
      await fetchWorkbenchMutation<DpmExceptionSummaryResponse>(
        buildWorkbenchUrl(
          "client",
          `/dpm/command-center/exceptions/${encodeURIComponent(params.exceptionId)}/ai-summary`
        ),
        "request DPM exception AI summary",
        {
          method: "POST",
          headers: buildDpmWaveCallerHeaders(),
          body: JSON.stringify(body),
        }
      )
  );
}

export async function getDpmMandateByPortfolio(
  portfolioId: string
): Promise<DpmCommandCenterGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.command-center.mandate.by-portfolio",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        `/dpm/command-center/mandates/by-portfolio/${encodeURIComponent(portfolioId)}`,
        "DPM mandate by portfolio"
      )
  );
}

export async function getDpmMandateHealth(
  mandateId: string
): Promise<DpmCommandCenterGatewayResponse> {
  return await observeWorkbenchResource(
    "dpm.command-center.mandate.health",
    async () =>
      await fetchWorkbenchResource<DpmCommandCenterGatewayResponse>(
        "server",
        `/dpm/command-center/mandates/${encodeURIComponent(mandateId)}/health`,
        "DPM mandate health"
      )
  );
}

export async function getDpmPortfolioMemory(params: {
  portfolioId: string;
  limit?: number;
}): Promise<DpmPortfolioMemoryGatewayResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 100));
  return await observeWorkbenchResource(
    "dpm.portfolio-memory.get",
    async () =>
      await fetchWorkbenchResource<DpmPortfolioMemoryGatewayResponse>(
        "server",
        `/dpm/command-center/portfolios/${encodeURIComponent(params.portfolioId)}/memory`,
        "DPM portfolio memory",
        query
      )
  );
}

export async function searchDpmPortfolioMemory(params: {
  portfolioIds?: string[];
  eventType?: string;
  supportabilityState?: string;
  sourceSystem?: string;
  sourceType?: string;
  limit?: number;
  offset?: number;
  sourceScanLimit?: number;
}): Promise<DpmPortfolioMemoryGatewayResponse> {
  const query = new URLSearchParams();
  for (const portfolioId of params.portfolioIds ?? []) {
    query.append("portfolio_ids", portfolioId);
  }
  if (params.eventType) {
    query.set("event_type", params.eventType);
  }
  if (params.supportabilityState) {
    query.set("supportability_state", params.supportabilityState);
  }
  if (params.sourceSystem) {
    query.set("source_system", params.sourceSystem);
  }
  if (params.sourceType) {
    query.set("source_type", params.sourceType);
  }
  query.set("limit", String(params.limit ?? 10));
  query.set("offset", String(params.offset ?? 0));
  if (typeof params.sourceScanLimit === "number") {
    query.set("source_scan_limit", String(params.sourceScanLimit));
  }
  return await observeWorkbenchResource(
    "dpm.portfolio-memory.search",
    async () =>
      await fetchWorkbenchResource<DpmPortfolioMemoryGatewayResponse>(
        "server",
        "/dpm/command-center/portfolio-memory/search",
        "DPM portfolio memory search",
        query
      )
  );
}
