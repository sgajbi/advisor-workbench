import { createServer, type Server, type ServerResponse } from "node:http";

import { fallbackNormalizedCapabilities } from "../../src/features/platform-capabilities/api";

export type ManageFixtureGateway = {
  close: () => Promise<void>;
  port: number;
};

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const mandateId = "MANDATE_PB_SG_GLOBAL_BAL_001";
const waveId = "dwv_001";

export async function startManageFixtureGateway({
  port,
}: {
  port: number;
}): Promise<ManageFixtureGateway> {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    const path = requestUrl.pathname;

    if (path === "/api/v1/platform/capabilities") {
      sendJson(response, {
        data: {
          consumerSystem: requestUrl.searchParams.get("consumerSystem") ?? "UI",
          tenantId: requestUrl.searchParams.get("tenantId") ?? "default",
          contractVersion: "v1",
          sources: {},
          partialFailure: false,
          errors: [],
          normalized: fallbackNormalizedCapabilities(),
        },
      });
      return;
    }
    if (path === `/api/v1/workbench/${portfolioId}/portfolio-360`) {
      sendJson(response, portfolio360());
      return;
    }
    if (
      path === `/api/v1/dpm/command-center/mandates/by-portfolio/${portfolioId}`
    ) {
      sendJson(response, mandateEnvelope());
      return;
    }
    if (path === `/api/v1/dpm/command-center/mandates/${mandateId}/health`) {
      sendJson(
        response,
        commandEnvelope({ dimensions: [] }, "corr-manage-health"),
      );
      return;
    }
    if (path === "/api/v1/dpm/command-center/waves") {
      sendJson(response, waveEnvelope());
      return;
    }
    if (path === `/api/v1/dpm/command-center/waves/${waveId}/items`) {
      sendJson(response, waveItemsEnvelope());
      return;
    }
    if (path === "/api/v1/dpm/command-center") {
      sendJson(
        response,
        commandEnvelope(
          {
            mandate_id: mandateId,
            mandate_health_state: "READY",
            data_completeness_state: "READY",
            latest_monitoring_run_status: "COMPLETE",
          },
          "corr-manage-command-center",
        ),
      );
      return;
    }
    if (path === "/api/v1/dpm/command-center/exceptions") {
      sendJson(
        response,
        commandEnvelope(
          { items: [], next_cursor: null },
          "corr-manage-exceptions",
        ),
      );
      return;
    }
    if (path === "/api/v1/dpm/command-center/waves/campaign-definitions") {
      sendJson(response, campaignEnvelope("corr-manage-campaigns"));
      return;
    }
    if (path === "/api/v1/dpm/command-center/waves/campaign-discovery") {
      sendJson(response, campaignEnvelope("corr-manage-campaign-discovery"));
      return;
    }
    if (path.startsWith("/api/v1/dpm/command-center")) {
      sendJson(
        response,
        { code: "fixture_optional_surface_unavailable", path },
        503,
      );
      return;
    }

    sendJson(response, { code: "fixture_route_not_found", path }, 404);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    port,
    close: () => closeServer(server),
  };
}

function portfolio360() {
  return {
    correlation_id: "corr-manage-portfolio",
    contract_version: "v1",
    as_of_date: "2026-05-03",
    portfolio: {
      portfolio_id: portfolioId,
      client_id: "CLIENT_SG_001",
      base_currency: "SGD",
      booking_center_code: "SG",
    },
    overview: {
      market_value_base: 12_500_000,
      cash_weight_pct: 6,
      position_count: 18,
    },
    performance_snapshot: null,
    rebalance_snapshot: null,
    current_positions: [],
    projected_positions: [],
    projected_summary: null,
    active_session_id: null,
    warnings: [],
    partial_failures: [],
  };
}

function mandateEnvelope() {
  return commandEnvelope(
    {
      mandate: {
        mandate_id: mandateId,
        portfolio_id: portfolioId,
        mandate_type: "DPM_GLOBAL_BALANCED",
        base_currency: "SGD",
        risk_profile: "BALANCED",
        as_of_date: "2026-05-03",
      },
    },
    "corr-manage-mandate",
  );
}

function commandEnvelope(data: Record<string, unknown>, correlationId: string) {
  return {
    correlation_id: correlationId,
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    supportability: {
      source_service: "lotus-manage",
      authority: "lotus-manage:RFC-0038",
      state: "SUPPORTED",
      data_completeness_state: "READY",
      partial_readiness_reasons: [],
      source_run_id: "manage-run-001",
      remediation_owner: null,
    },
    data,
  };
}

function waveEnvelope() {
  return {
    correlation_id: "corr-manage-wave",
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    supportability: {
      source_service: "lotus-manage",
      authority: "lotus-manage:RFC-0041",
      state: "READY",
      reason_codes: [],
      blocked_actions: [],
      wave_id: waveId,
      wave_state: "SIMULATION_READY",
      item_count: 2,
      issue_count: 0,
      remediation_owner: "Portfolio Operations",
    },
    data: {
      items: [
        {
          wave_id: waveId,
          state: "SIMULATION_READY",
          trigger_type: "EXPLICIT_PORTFOLIO_LIST",
          as_of_date: "2026-05-03",
          item_count: 2,
          issue_count: 0,
          supportability_state: "READY",
          supportability_reason: "WAVE_SUPPORTABILITY_READY",
          aggregate_metrics: {
            turnover_pct: "4.8%",
            cash_after_pct: "2.1%",
            drift_improvement_pct: "72.4%",
            issue_count: 0,
          },
        },
      ],
    },
  };
}

function waveItemsEnvelope() {
  return {
    ...waveEnvelope(),
    correlation_id: "corr-manage-wave-items",
    data: {
      items: [
        {
          wave_item_id: "dwi_001",
          portfolio_id: portfolioId,
          state: "SIMULATION_READY",
          source_readiness_state: "READY",
          diagnostics: {
            proposed_changes: [
              {
                security_id: "AAPL US",
                action: "Trim",
                estimated_value: "7,420.00",
                reason: "Equity overweight",
                mandate_impact: "Improves equity band",
                status: "READY",
              },
              {
                security_id: "MSFT US",
                action: "Buy",
                estimated_value: "3,840.50",
                reason: "Target allocation",
                mandate_impact: "Improves benchmark alignment",
                status: "READY",
              },
            ],
          },
        },
      ],
    },
  };
}

function campaignEnvelope(correlationId: string) {
  return {
    correlation_id: correlationId,
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    data: { items: [] },
  };
}

function sendJson(response: ServerResponse, payload: unknown, status = 200) {
  response.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
