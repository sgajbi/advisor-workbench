"use client";

import { Box } from "@mui/material";

import { Text, WorkbenchECharts } from "@/design-system";
import { lotusThemeTokens } from "@/design-system/theme/tokens";
import type { EChartsOption } from "echarts";

import type { PerformanceReturnPathLegendItem } from "./performance-return-path-legend";
import PerformanceReturnPathLegend from "./performance-return-path-legend";
import PerformanceReturnPathSingleObservationStage, {
  type PerformanceReturnPathSingleObservationPresentation,
} from "./performance-return-path-single-observation-stage";
import { SHARED_CHART_TEXT } from "./performance-return-path-chart-model";
import styles from "./performance-return-path-chart-stage.module.css";

type PerformanceReturnPathChartStageProps = {
  title: string;
  option: EChartsOption;
  legendItems: PerformanceReturnPathLegendItem[];
  isDetailsPending: boolean;
  singleObservation?: PerformanceReturnPathSingleObservationPresentation | null;
};

export default function PerformanceReturnPathChartStage({
  title,
  option,
  legendItems,
  isDetailsPending,
  singleObservation,
}: PerformanceReturnPathChartStageProps) {
  return (
    <div
      className={`performance-chart-library-frame workbench-summary-visual ${styles.stage} ${singleObservation ? styles.singleObservationStage : ""}`}
      data-layout={singleObservation ? "single-observation" : "time-series"}
      role={singleObservation ? "group" : "img"}
      aria-label={`${title} ${singleObservation ? "single observation comparison" : "chart"}`}
      style={{ position: "relative" }}
    >
      {singleObservation ? (
        <>
          <PerformanceReturnPathSingleObservationStage
            observation={singleObservation}
            legendItems={legendItems}
          />
          <div
            aria-hidden="true"
            style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
          >
            <WorkbenchECharts
              option={option}
              style={{ width: "1px", height: "1px" }}
              opts={{ renderer: "svg" }}
              notMerge
              lazyUpdate
            />
          </div>
        </>
      ) : (
        <div className="performance-return-path-chart-shell">
          <div className="performance-return-path-chart-y-axis-title" aria-label="Y axis title">
            Return
          </div>
          <div className="performance-return-path-chart-main">
            <PerformanceReturnPathLegend items={legendItems} />
            <WorkbenchECharts
              option={option}
              style={{ width: "100%", height: "448px" }}
              opts={{ renderer: "svg" }}
              notMerge
              lazyUpdate
            />
            <div className="performance-return-path-chart-x-axis-title" aria-label="X axis title">
              Reporting Period
            </div>
          </div>
        </div>
      )}
      {isDetailsPending ? (
        <Box
          sx={{
            position: "absolute",
            top: lotusThemeTokens.spacing.step3,
            right: lotusThemeTokens.spacing.step3,
            px: lotusThemeTokens.spacing.step3,
            py: lotusThemeTokens.spacing.step1,
            borderRadius: SHARED_CHART_TEXT.refreshRadius,
            bgcolor: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(31,39,51,0.08)",
            boxShadow: "0 8px 18px rgba(16, 40, 51, 0.08)",
          }}
        >
          <Text variant="metadata" as="span">
            Refreshing analytical series
          </Text>
        </Box>
      ) : null}
    </div>
  );
}
