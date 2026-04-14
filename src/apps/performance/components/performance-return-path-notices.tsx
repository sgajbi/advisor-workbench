type PerformanceReturnPathNoticesProps = {
  partialReason: string | null | undefined;
  benchmarkStateBody: string | null | undefined;
};

export default function PerformanceReturnPathNotices({
  partialReason,
  benchmarkStateBody,
}: PerformanceReturnPathNoticesProps) {
  if (!partialReason && !benchmarkStateBody) {
    return null;
  }

  return (
    <>
      {partialReason ? (
        <div
          className="performance-analytical-inline-note"
          role="status"
          aria-label="Return history partial state"
        >
          <span className="performance-analytical-inline-note-label">Partial history</span>
          <p>{partialReason}</p>
        </div>
      ) : null}
      {benchmarkStateBody ? (
        <div className="performance-chart-benchmark-state">
          <strong>Benchmark unassigned</strong>
          <span>{benchmarkStateBody}</span>
        </div>
      ) : null}
    </>
  );
}
