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
import { buildPortfolioDateFacts } from "../portfolio-terminology";
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
      key: "affected-positions",
      label: "Affected positions",
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
    kicker: "Readiness issue",
    title: exception.title,
    subtitle: "Operational explanation and current evidence for this portfolio gap.",
    summaryItems: [
      { label: "Severity", value: formatStatus(exception.tone) },
      { label: "Portfolio", value: workspace.portfolio.portfolio_id },
      ...buildPortfolioDateFacts(
        workspace.as_of_date,
        context.selectedAsOfDate,
      ).map(({ label, date }) => ({ label, value: formatDate(date) })),
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
        ["Ranked positions", formatCount(workspace.top_positions.length, "position")],
        [
          "Reported position count",
          formatCount(workspace.summary.position_count, "position"),
        ],
      ];
    case "pricing":
      return [
        [
          "Valued positions",
          formatCount(
            workspace.positions.filter((position) => (position.market_value_base ?? 0) > 0)
              .length,
            "position"
          ),
        ],
        ["Allocation views", String(workspace.allocation_views?.length ?? 0)],
        [
          "Failed valuation jobs",
          String(workspace.operations?.failed_valuation_jobs_within_window ?? 0),
        ],
      ];
    case "transactions":
      return [
        [
          "Transactions in view",
          formatCount(workspace.recent_transactions.length, "transaction"),
        ],
        [
          "Latest booked transaction",
          formatDate(workspace.operations?.latest_booked_transaction_date),
        ],
        ["Window end", formatDate(workspace.as_of_date)],
      ];
    case "reporting":
      return [
        ["Reporting status", formatStatus(workspace.readiness.reporting.status)],
        ["Report rows", String(workspace.readiness.reporting.row_count)],
        ["Generated at", formatTimestamp(workspace.readiness.reporting.generated_at_utc)],
      ];
    case "controls_blocking":
      return [
        [
          "Publishing allowed",
          formatBooleanFlag(workspace.operations?.publish_allowed),
        ],
        [
          "Blocking controls",
          formatBooleanFlag(workspace.operations?.controls_blocking),
        ],
        [
          "Active reprocessing keys",
          String(workspace.operations?.active_reprocessing_keys ?? 0),
        ],
      ];
    default: {
      const failure = workspace.partial_failures.find(
        (item) => `partial_failure_${item.error_code}` === key
      );
      return [
        ["Source service", failure?.source_service ?? "Unknown"],
        ["Error code", failure?.error_code ?? "Unknown"],
        ["Detail", failure?.detail ?? "No additional evidence available"],
      ];
    }
  }
}
