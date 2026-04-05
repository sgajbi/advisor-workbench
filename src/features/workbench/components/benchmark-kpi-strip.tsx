import { SectionBlock, WorkbenchSummaryMetricStrip } from "@/design-system";

type Props = {
  returnPct: number | null;
  benchmarkReturnPct: number | null;
  activeReturnPct: number | null;
  projectedCoveragePct: number;
};

function formatPct(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `${value.toFixed(2)}%`;
}

export default function BenchmarkKpiStrip(props: Props) {
  return (
    <SectionBlock title="Benchmark Relative Snapshot">
      <WorkbenchSummaryMetricStrip
        ariaLabel="Benchmark relative snapshot"
        items={[
          { key: "portfolio-return", label: "Portfolio Return", value: formatPct(props.returnPct) },
          { key: "benchmark-return", label: "Benchmark Return", value: formatPct(props.benchmarkReturnPct) },
          { key: "active-return", label: "Active Return", value: formatPct(props.activeReturnPct) },
          { key: "simulation-coverage", label: "Simulation Coverage", value: formatPct(props.projectedCoveragePct) },
        ]}
      />
    </SectionBlock>
  );
}
