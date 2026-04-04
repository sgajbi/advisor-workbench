export default function PerformanceAnalysisToolbar({
  children,
  context,
}: {
  children: React.ReactNode;
  context?: React.ReactNode;
}) {
  return (
    <div className="performance-analysis-toolbar">
      {children}
      {context ? (
        <div className="performance-analysis-toolbar-context" aria-label="Analysis context">
          {context}
        </div>
      ) : null}
    </div>
  );
}
