"use client";

import { useState } from "react";

import {
  WorkbenchSummaryVisualLabel,
  WorkbenchSummaryVisualMeta,
  WorkbenchSummaryVisualValue,
} from "@/design-system";

import { formatCurrency, formatDate } from "../formatters";
import {
  buildActivityTooltip,
  describeActivityBucket,
  formatBucketLabel,
} from "../portfolio-chart-view-model";
import type { PortfolioActivitySummaryView } from "../types";

export default function PortfolioActivityPanel({
  summary,
  selectedBucket,
  onSelectionChange,
  compact = false,
}: {
  summary: PortfolioActivitySummaryView;
  selectedBucket?: string | null;
  onSelectionChange?: (bucket: string | null) => void;
  compact?: boolean;
}) {
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);
  const maxAmount = Math.max(
    ...summary.buckets.map((bucket) =>
      Math.abs(bucket.requested_window.reporting_currency_amount),
    ),
    1,
  );

  return (
    <div
      className={
        compact
          ? "portfolio-analytics-canvas portfolio-chart-card portfolio-chart-card-analytic portfolio-chart-card-compact"
          : "portfolio-analytics-canvas portfolio-chart-card portfolio-chart-card-analytic"
      }
    >
      <div className="portfolio-analytical-utility-header">
        <span>Requested Window</span>
        <strong>{`${formatDate(summary.window_start_date)} - ${formatDate(summary.window_end_date)}`}</strong>
      </div>
      <div
        className={
          compact
            ? "portfolio-flow-chart portfolio-flow-chart-compact"
            : "portfolio-flow-chart"
        }
        aria-label="Activity chart"
        role="list"
      >
        {summary.buckets.map((bucket) => {
          const requestedAmount =
            bucket.requested_window.reporting_currency_amount;
          const ytdAmount = bucket.year_to_date.reporting_currency_amount;
          const selected = selectedBucket === bucket.bucket;
          const hovered = hoveredBucket === bucket.bucket;
          const magnitude = Math.abs(requestedAmount);
          const width = `${(magnitude / maxAmount) * 100}%`;
          const direction = requestedAmount < 0 ? "negative" : "positive";

          return (
            <button
              key={bucket.bucket}
              type="button"
              role="listitem"
              aria-label={`${buildActivityTooltip(bucket.bucket, requestedAmount, ytdAmount, summary.reporting_currency).replaceAll("\n", ". ")} Select to filter transactions.`}
              className={
                selected
                  ? compact
                    ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-compact portfolio-stacked-bar-group-selected"
                    : "portfolio-stacked-bar-group portfolio-stacked-bar-group-selected"
                  : hovered
                    ? compact
                      ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-compact portfolio-stacked-bar-group-hovered"
                      : "portfolio-stacked-bar-group portfolio-stacked-bar-group-hovered"
                    : compact
                      ? "portfolio-stacked-bar-group portfolio-stacked-bar-group-compact"
                      : "portfolio-stacked-bar-group"
              }
              onMouseEnter={() => setHoveredBucket(bucket.bucket)}
              onMouseLeave={() => setHoveredBucket(null)}
              onClick={() =>
                onSelectionChange?.(selected ? null : bucket.bucket)
              }
              title={buildActivityTooltip(
                bucket.bucket,
                requestedAmount,
                ytdAmount,
                summary.reporting_currency,
              )}
            >
              <div className="portfolio-flow-row-header">
                <WorkbenchSummaryVisualLabel className="portfolio-flow-row-label">
                  {formatBucketLabel(bucket.bucket)}
                </WorkbenchSummaryVisualLabel>
                <WorkbenchSummaryVisualValue className="portfolio-flow-row-value">
                  {formatCurrency(requestedAmount, summary.reporting_currency)}
                </WorkbenchSummaryVisualValue>
              </div>
              <div className="portfolio-flow-row-chart" aria-hidden="true">
                <span className="portfolio-flow-row-axis" />
                <span
                  className={`portfolio-flow-row-bar portfolio-flow-row-bar-${direction}`}
                  style={
                    requestedAmount < 0
                      ? { width, left: `calc(50% - ${width})` }
                      : { width, left: "50%" }
                  }
                />
              </div>
              {compact ? (
                <WorkbenchSummaryVisualMeta className="portfolio-flow-row-meta portfolio-flow-row-meta-compact">
                  <span>
                    YTD {formatCurrency(ytdAmount, summary.reporting_currency)}
                  </span>
                  <span>
                    {bucket.requested_window.transaction_count} events
                  </span>
                </WorkbenchSummaryVisualMeta>
              ) : (
                <WorkbenchSummaryVisualMeta className="portfolio-flow-row-meta">
                  <span>{describeActivityBucket(bucket.bucket)}</span>
                  <span>
                    YTD {formatCurrency(ytdAmount, summary.reporting_currency)}
                  </span>
                  <span>{bucket.requested_window.transaction_count} txn</span>
                </WorkbenchSummaryVisualMeta>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
