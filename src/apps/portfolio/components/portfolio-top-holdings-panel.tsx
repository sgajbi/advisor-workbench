"use client";

import { useMemo, useState } from "react";

import {
  WorkbenchSummaryToolbar,
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";

import { formatCurrency, formatPct, formatQuantity } from "../formatters";
import { buildTopHoldingTooltip } from "../portfolio-chart-view-model";
import type { HoldingsMetric } from "../portfolio-chart-view-model";
import type { PortfolioTopPosition } from "../types";

const TOP_POSITIONS_CHART_COLORS = {
  accent: "#315d8a",
} as const;

export default function PortfolioTopHoldingsPanel({
  positions,
  baseCurrency,
  selectedSecurityId,
  onSelectionChange,
}: {
  positions: PortfolioTopPosition[];
  baseCurrency: string;
  selectedSecurityId: string | null;
  onSelectionChange: (securityId: string | null) => void;
}) {
  const [metric, setMetric] = useState<HoldingsMetric>("market_value");
  const [hoveredSecurityId, setHoveredSecurityId] = useState<string | null>(
    null,
  );
  const sortedPositions = useMemo(() => {
    return [...positions].sort((left, right) => {
      const leftMetric =
        metric === "market_value"
          ? (left.market_value_base ?? 0)
          : (left.weight_pct ?? 0);
      const rightMetric =
        metric === "market_value"
          ? (right.market_value_base ?? 0)
          : (right.weight_pct ?? 0);
      return rightMetric - leftMetric;
    });
  }, [metric, positions]);
  const maxMetric = Math.max(
    ...sortedPositions.map((position) =>
      metric === "market_value"
        ? (position.market_value_base ?? 0)
        : (position.weight_pct ?? 0),
    ),
    0,
  );

  return (
    <div className="portfolio-chart-module">
      <WorkbenchSummaryToolbar className="portfolio-chart-module-toolbar">
        <div
          className="portfolio-chart-toggle-group"
          aria-label="Ranked positions metric"
        >
          <button
            type="button"
            aria-pressed={metric === "market_value"}
            className={
              metric === "market_value"
                ? "portfolio-chart-toggle portfolio-chart-toggle-active"
                : "portfolio-chart-toggle"
            }
            onClick={() => setMetric("market_value")}
          >
            Market value
          </button>
          <button
            type="button"
            aria-pressed={metric === "weight"}
            className={
              metric === "weight"
                ? "portfolio-chart-toggle portfolio-chart-toggle-active"
                : "portfolio-chart-toggle"
            }
            onClick={() => setMetric("weight")}
          >
            Weight
          </button>
        </div>
      </WorkbenchSummaryToolbar>
      <div className="portfolio-chart-module-body portfolio-top-holdings-body">
        <div className="portfolio-analytics-canvas portfolio-chart-card portfolio-top-holdings-list-card">
          <div className="portfolio-analytical-utility-header">
            <span>Ranked positions</span>
            <strong>
              {metric === "market_value"
                ? "Market value focus"
                : "Weight focus"}
            </strong>
          </div>
          {sortedPositions.length ? (
            <div
              className="portfolio-horizontal-bar-chart"
              aria-label="Ranked positions chart"
              role="list"
            >
              {sortedPositions.map((position) => {
                const metricValue =
                  metric === "market_value"
                    ? (position.market_value_base ?? 0)
                    : (position.weight_pct ?? 0);
                const width =
                  maxMetric > 0 ? `${(metricValue / maxMetric) * 100}%` : "0%";
                const selected = selectedSecurityId === position.security_id;
                const hovered = hoveredSecurityId === position.security_id;
                return (
                  <button
                    key={position.security_id}
                    type="button"
                    role="listitem"
                    className={
                      selected
                        ? "portfolio-horizontal-bar-row portfolio-horizontal-bar-row-selected"
                        : hovered
                          ? "portfolio-horizontal-bar-row portfolio-horizontal-bar-row-hovered"
                          : "portfolio-horizontal-bar-row"
                    }
                    onMouseEnter={() =>
                      setHoveredSecurityId(position.security_id)
                    }
                    onMouseLeave={() => setHoveredSecurityId(null)}
                    onClick={() =>
                      onSelectionChange(
                        selectedSecurityId === position.security_id
                          ? null
                          : position.security_id,
                      )
                    }
                    aria-label={`${position.instrument_name}: ${
                      metric === "market_value"
                        ? formatCurrency(
                            position.market_value_base,
                            baseCurrency,
                          )
                        : formatPct(position.weight_pct)
                    }. Select to filter positions.`}
                    title={buildTopHoldingTooltip(
                      position,
                      metric,
                      baseCurrency,
                    )}
                  >
                    <div className="portfolio-horizontal-bar-copy">
                      <WorkbenchSummaryVisualLabel className="portfolio-horizontal-bar-label">
                        {position.instrument_name}
                      </WorkbenchSummaryVisualLabel>
                      <WorkbenchSummaryVisualMeta className="portfolio-horizontal-bar-meta">
                        <span>{position.asset_class}</span>
                        <span>{formatQuantity(position.quantity)}</span>
                      </WorkbenchSummaryVisualMeta>
                    </div>
                    <span className="portfolio-horizontal-bar-track">
                      <span
                        className="portfolio-horizontal-bar-fill"
                        style={{
                          width,
                          backgroundColor: TOP_POSITIONS_CHART_COLORS.accent,
                        }}
                      />
                    </span>
                    <WorkbenchSummaryVisualValue className="portfolio-horizontal-bar-value">
                      {metric === "market_value"
                        ? formatCurrency(
                            position.market_value_base,
                            baseCurrency,
                          )
                        : formatPct(position.weight_pct)}
                    </WorkbenchSummaryVisualValue>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="portfolio-top-holdings-empty" role="status">
              <strong>No top positions available for this view</strong>
              <p className="muted">
                Ranked positions require source-backed positions with current market
                values. Adjust the allocation filter or publish valuations to
                populate this view.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
