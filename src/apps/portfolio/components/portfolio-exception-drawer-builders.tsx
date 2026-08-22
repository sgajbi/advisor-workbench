"use client";

import {
  formatBooleanFlag,
  formatCount,
  formatDate,
  formatStatus,
  formatTimestamp,
} from "../formatters";
import type { PortfolioPositionView, PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  renderDrawerDefinitionList,
  renderDrawerParagraphs,
} from "./portfolio-detail-drawer-shared";
import type { PortfolioDetailDrawerState } from "./portfolio-detail-drawer-types";

type PortfolioExceptionSummary = {
  key: string;
  title: string;
  detail: string;
  tone: "neutral" | "success" | "warn" | "danger";
  href: string;
};

export function buildExceptionDrawer(
  exception: PortfolioExceptionSummary,
  workspace: PortfolioWorkspace,
  context: PortfolioWorkspaceContext,
  affectedPositions: PortfolioPositionView[] = []
): PortfolioDetailDrawerState {
  const tabs: PortfolioDetailDrawerState["tabs"] = [
    {
      key: "explanation",
      label: "Explanation",
      content: renderDrawerParagraphs([exception.detail]),
    },
    {
      key: "evidence",
      label: "Evidence",
      content: renderDrawerDefinitionList(resolveExceptionEvidence(exception.key, workspace)),
    },
  ];

  if (exception.key === "pricing" && affectedPositions.length) {
    tabs.push({
      key: "affected-holdings",
      label: "Affected Holdings",
      content: renderDrawerDefinitionList(
        affectedPositions.slice(0, 8).map((position) => [
          position.instrument_name,
          position.market_price == null && position.market_value_base == null
            ? "Price and valuation missing"
            : position.market_price == null
              ? "Price missing"
              : "Valuation missing",
        ])
      ),
    });
  }

  return {
    kicker: "Readiness Issue",
    title: exception.title,
    subtitle: "Operational explanation and current evidence for this portfolio gap.",
    summaryItems: [
      { label: "Severity", value: formatStatus(exception.tone) },
      { label: "Portfolio", value: workspace.portfolio.portfolio_id },
      { label: "As of", value: formatDate(context.selectedAsOfDate) },
    ],
    tabs,
    fullPageHref: exception.href,
    fullPageLabel: "Open related section",
  };
}

function resolveExceptionEvidence(
  key: string,
  workspace: PortfolioWorkspace
): Array<[string, string]> {
  switch (key) {
    case "holdings":
      return [
        ["Positions", formatCount(workspace.positions.length, "position")],
        ["Top Holdings", formatCount(workspace.top_positions.length, "holding")],
        [
          "Reported Position Count",
          formatCount(workspace.summary.position_count, "holding"),
        ],
      ];
    case "pricing":
      return [
        [
          "Valued Positions",
          formatCount(
            workspace.positions.filter((position) => (position.market_value_base ?? 0) > 0)
              .length,
            "position"
          ),
        ],
        ["Allocation Views", String(workspace.allocation_views?.length ?? 0)],
        [
          "Failed Valuation Jobs",
          String(workspace.operations?.failed_valuation_jobs_within_window ?? 0),
        ],
      ];
    case "transactions":
      return [
        [
          "Transactions in View",
          formatCount(workspace.recent_transactions.length, "transaction"),
        ],
        [
          "Latest Booked Transaction",
          formatDate(workspace.operations?.latest_booked_transaction_date),
        ],
        ["Window End", formatDate(workspace.as_of_date)],
      ];
    case "reporting":
      return [
        ["Reporting Status", formatStatus(workspace.readiness.reporting.status)],
        ["Report Rows", String(workspace.readiness.reporting.row_count)],
        ["Generated At", formatTimestamp(workspace.readiness.reporting.generated_at_utc)],
      ];
    case "controls_blocking":
      return [
        [
          "Publishing Allowed",
          formatBooleanFlag(workspace.operations?.publish_allowed),
        ],
        [
          "Blocking Controls",
          formatBooleanFlag(workspace.operations?.controls_blocking),
        ],
        [
          "Active Reprocessing Keys",
          String(workspace.operations?.active_reprocessing_keys ?? 0),
        ],
      ];
    default: {
      const failure = workspace.partial_failures.find(
        (item) => `partial_failure_${item.error_code}` === key
      );
      return [
        ["Source Service", failure?.source_service ?? "Unknown"],
        ["Error Code", failure?.error_code ?? "Unknown"],
        ["Detail", failure?.detail ?? "No additional evidence available"],
      ];
    }
  }
}
