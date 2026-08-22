import { createServer, type Server, type ServerResponse } from "node:http";

import { fallbackNormalizedCapabilities } from "../../src/features/platform-capabilities/api";

export type ManageFixtureGateway = {
  close: () => Promise<void>;
  port: number;
};

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const mandateId = "MANDATE_PB_SG_GLOBAL_BAL_001";
const waveId = "dwv_001";
const campaignId = "campaign-holdings-202605";

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
    const launchedWaveItemsMatch = path.match(
      /^\/api\/v1\/dpm\/command-center\/waves\/(dwv_campaign_[^/]+)\/items$/,
    );
    if (launchedWaveItemsMatch) {
      const launchedWaveId = launchedWaveItemsMatch[1];
      sendJson(response, {
        ...waveEnvelope(),
        supportability: {
          ...waveEnvelope().supportability,
          wave_id: launchedWaveId,
          wave_state: "CREATED",
          item_count: 0,
        },
        data: { items: [] },
      });
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
    const campaignMatch = path.match(
      /^\/api\/v1\/dpm\/command-center\/waves\/campaign-definitions\/([^/]+)\/versions\/([^/]+)\/(.+)$/,
    );
    if (campaignMatch) {
      const [, requestedCampaignId, campaignVersion, surface] = campaignMatch;
      if (requestedCampaignId !== campaignId) {
        sendJson(response, { code: "fixture_campaign_not_found" }, 404);
        return;
      }
      if (surface === "lifecycle-events") {
        sendJson(response, campaignLifecycleEnvelope(campaignVersion));
        return;
      }
      if (surface === "launch-history") {
        sendJson(response, campaignLaunchHistoryEnvelope(campaignVersion));
        return;
      }
      if (surface === "preview-readiness") {
        sendJson(response, campaignPreviewReadinessEnvelope(campaignVersion));
        return;
      }
      if (surface === "launch-package") {
        sendJson(response, campaignLaunchPackageEnvelope(campaignVersion));
        return;
      }
      if (
        [
          "approval-decisions",
          "assignment-actions",
          "assignment-tasks",
          "maker-checker-controls",
        ].includes(surface)
      ) {
        sendJson(response, campaignWorkflowEvidenceEnvelope(campaignVersion, surface));
        return;
      }
      if (surface === "launch" && request.method === "POST") {
        sendJson(response, campaignLaunchEnvelope(campaignVersion), 201);
        return;
      }
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
    data: {
      items: [
        campaignDefinition("2026.05", "Asia growth holdings review", "2026-05-10", 12),
        campaignDefinition("2026.06", "Singapore balanced mandate refresh", "2026-06-10", 7),
      ],
      limit: 10,
      offset: 0,
      count: 2,
    },
  };
}

function campaignDefinition(
  campaignVersion: string,
  displayName: string,
  asOfDate: string,
  candidateCount: number,
) {
  return {
    product_name: "BulkReviewCampaignDiscovery",
    campaign_id: campaignId,
    campaign_version: campaignVersion,
    display_name: displayName,
    status: "ACTIVE",
    campaign_status: "ACTIVE",
    as_of_date: asOfDate,
    eligible_portfolio_types: ["DISCRETIONARY"],
    candidate_count: candidateCount,
    eligible_candidate_count: candidateCount - 1,
    governance_status: "APPROVED",
    expiry_state: "ACTIVE",
    access_purpose: "rebalance_review",
    source_ref_count: 2,
    candidates: [
      {
        portfolio_id: portfolioId,
        portfolio_type: "DISCRETIONARY",
        source_refs: [
          { source_type: "PortfolioManagerBookMembership", source_id: "book-sg-1" },
        ],
      },
    ],
    governance: {
      approval_ref: `BRC-APPROVAL-${campaignVersion}`,
      approved_by: "investment_control_sg",
    },
    source_refs: [
      { source_type: "BulkReviewCampaignDefinition", source_id: `${campaignId}:${campaignVersion}` },
    ],
  };
}

function campaignLifecycleEnvelope(campaignVersion: string) {
  return commandEnvelope(
    {
      campaign_id: campaignId,
      campaign_version: campaignVersion,
      events: [
        {
          event_type: "ACTIVATED",
          occurred_at: "2026-05-14T09:30:00Z",
          actor_id: "portfolio_manager_sg",
          status: "RECORDED",
          reason_code: "campaign_definition_activated",
          correlation_id: `corr-campaign-${campaignVersion}`,
        },
      ],
    },
    `corr-campaign-lifecycle-${campaignVersion}`,
  );
}

function campaignLaunchHistoryEnvelope(campaignVersion: string) {
  return commandEnvelope(
    {
      product_name: "BulkReviewCampaignDefinitionLaunchHistory",
      campaign_id: campaignId,
      campaign_version: campaignVersion,
      items: [],
      limit: 10,
      offset: 0,
      count: 0,
      total_count: 0,
      operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
    },
    `corr-campaign-launch-history-${campaignVersion}`,
  );
}

function campaignPreviewReadinessEnvelope(campaignVersion: string) {
  return commandEnvelope(
    {
      product_name: "BulkReviewCampaignDefinitionPreviewReadiness",
      campaign_id: campaignId,
      campaign_version: campaignVersion,
      requested_as_of_date: campaignVersion === "2026.06" ? "2026-06-10" : "2026-05-10",
      actor_id: "portfolio_manager_sg",
      supportability_state: "READY",
      reason_codes: [],
      blocked_actions: [],
      operating_boundaries: ["NO_ORDER_GENERATION", "NO_OMS_EXECUTION_CLAIM"],
    },
    `corr-campaign-preview-${campaignVersion}`,
  );
}

function campaignLaunchPackageEnvelope(campaignVersion: string) {
  return commandEnvelope(
    {
      product_name: "BulkReviewCampaignDefinitionLaunchPackage",
      campaign_id: campaignId,
      campaign_version: campaignVersion,
      requested_as_of_date: campaignVersion === "2026.06" ? "2026-06-10" : "2026-05-10",
      actor_id: "portfolio_manager_sg",
      launch_state: "READY",
      reason_codes: [],
      create_headers: {
        "Idempotency-Key": `campaign-launch:${campaignId}:${campaignVersion}:fixture`,
      },
    },
    `corr-campaign-launch-package-${campaignVersion}`,
  );
}

function campaignWorkflowEvidenceEnvelope(campaignVersion: string, surface: string) {
  return commandEnvelope(
    {
      items: [
        {
          campaign_id: campaignId,
          campaign_version: campaignVersion,
          evidence_ref: `${surface}:${campaignVersion}`,
          status: "SUPPORTABLE",
          content_hash: `sha256:${surface}:${campaignVersion}`,
          reason_codes: [],
        },
      ],
      count: 1,
      total_count: 1,
      limit: 10,
      offset: 0,
    },
    `corr-campaign-${surface}-${campaignVersion}`,
  );
}

function campaignLaunchEnvelope(campaignVersion: string) {
  return {
    ...waveEnvelope(),
    correlation_id: `corr-campaign-launch-${campaignVersion}`,
    upstream_status: 201,
    supportability: {
      ...waveEnvelope().supportability,
      wave_id: `dwv_campaign_${campaignVersion.replace(".", "_")}`,
      wave_state: "CREATED",
    },
    data: {
      wave: {
        wave_id: `dwv_campaign_${campaignVersion.replace(".", "_")}`,
        state: "CREATED",
        trigger_type: "BULK_REVIEW_CAMPAIGN",
      },
      durable: true,
    },
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
