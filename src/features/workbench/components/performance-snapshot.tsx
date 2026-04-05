"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import { SectionBlock, Text } from "@/design-system";

type Props = {
  period: string;
  returnPct: number | null;
  benchmarkReturnPct: number | null;
};

export default function PerformanceSnapshot(props: Props) {
  const option = useMemo(() => {
    const portfolio = props.returnPct ?? 0;
    const benchmark = props.benchmarkReturnPct ?? 0;
    return {
      tooltip: { trigger: "axis" as const },
      xAxis: {
        type: "category" as const,
        data: ["Benchmark", "Portfolio"],
      },
      yAxis: {
        type: "value" as const,
        axisLabel: { formatter: "{value}%" },
      },
      series: [
        {
          type: "bar" as const,
          data: [benchmark, portfolio],
          itemStyle: { color: "#0a4da3" },
          barWidth: 36,
        },
      ],
      grid: { left: 32, right: 16, top: 14, bottom: 24 },
    };
  }, [props.benchmarkReturnPct, props.returnPct]);

  return (
    <SectionBlock title="Performance Snapshot">
      <Text variant="body" className="workbench-summary-copy">
        {props.period}: {props.returnPct ?? "N/A"}
      </Text>
      <Text variant="secondary" className="muted">
        Benchmark: {props.benchmarkReturnPct ?? "N/A"}
      </Text>
      <ReactECharts option={option} style={{ height: 240 }} notMerge lazyUpdate />
    </SectionBlock>
  );
}
