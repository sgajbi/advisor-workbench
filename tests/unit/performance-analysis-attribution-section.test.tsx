import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAnalysisAttributionSection from "../../src/apps/performance/components/performance-analysis-attribution-section";
import type { PerformanceAnalysisAttributionSectionProps } from "../../src/apps/performance/components/performance-workspace-types";
import {
  buildPerformanceCapabilities,
  buildPerformanceWorkspace,
} from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/apps/performance/components/performance-relative-segment-panel", () => ({
  default: () => <div>Relative Segment Panel</div>,
}));

const supportedCapabilities = buildPerformanceCapabilities();

function buildProps(
  overrides: Partial<PerformanceAnalysisAttributionSectionProps> = {}
): PerformanceAnalysisAttributionSectionProps {
  const workspace = buildPerformanceWorkspace();
  return {
    workspace,
    attributionDimension: "asset_class",
    onRequestChange: vi.fn(),
    isUpdating: false,
    isDetailsPending: false,
    capabilities: supportedCapabilities,
    relativeSegmentRows: [
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: 0.45,
        active_weight_pct: 3,
        active_return_pct: 0.6,
      },
    ],
    topAttributionEffectRows: [
      {
        key_label: "Equity",
        portfolio_weight_avg_pct: 61,
        benchmark_weight_avg_pct: 58,
        portfolio_return_pct: 7.4,
        benchmark_return_pct: 6.8,
        allocation_pct: 0.18,
        selection_pct: 0.24,
        interaction_pct: 0.03,
        total_effect_pct: 0.45,
      },
    ],
    attributionEffectScale: 0.45,
    ...overrides,
  };
}

describe("PerformanceAnalysisAttributionSection", () => {
  it("renders benchmark-relative attribution detail and effect ranking", () => {
    render(<PerformanceAnalysisAttributionSection {...buildProps()} />);

    expect(screen.getByText("Attribution Detail")).toBeInTheDocument();
    expect(screen.getByText("Relative Segment Panel")).toBeInTheDocument();
    expect(screen.getByText("Total Effect Ranking")).toBeInTheDocument();
    expect(screen.getAllByText("BMK GLOBAL BALANCED 60 40").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Asset Class attribution table")).toBeInTheDocument();
    expect(screen.getByLabelText("Attribution effect legend")).toBeInTheDocument();
  });

  it("renders an actionable fallback when attribution detail is unavailable", () => {
    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            attributionDetail: {
              state: "unavailable",
              reason: "Attribution detail is not available for the current selection.",
            },
          },
          relativeSegmentRows: [],
          topAttributionEffectRows: [],
        })}
      />
    );

    expect(screen.getByText("Attribution detail unavailable")).toBeInTheDocument();
    expect(screen.getByText("Attribution detail is not available for the current selection.")).toBeInTheDocument();
  });

  it("renders a partial-state panel when attribution coverage is incomplete", () => {
    render(
      <PerformanceAnalysisAttributionSection
        {...buildProps({
          capabilities: {
            ...supportedCapabilities,
            attributionDetail: {
              state: "partial",
              reason: "Benchmark-relative attribution is incomplete for the current selection.",
            },
          },
          relativeSegmentRows: [],
          topAttributionEffectRows: [],
        })}
      />
    );

    expect(screen.getByText("Attribution detail is partial")).toBeInTheDocument();
    expect(screen.getByText("Benchmark-relative attribution is incomplete for the current selection.")).toBeInTheDocument();
  });
});
