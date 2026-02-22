type Props = {
  period: string;
  returnPct: number | null;
  benchmarkReturnPct: number | null;
};

export default function PerformanceSnapshot(props: Props) {
  return (
    <section>
      <h2>Performance Snapshot</h2>
      <p>{props.period}: {props.returnPct ?? "N/A"}</p>
      <p>Benchmark: {props.benchmarkReturnPct ?? "N/A"}</p>
    </section>
  );
}
