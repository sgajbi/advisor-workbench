export default function PerformanceAnalysisLevelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="performance-analysis-level-section">
      <header className="performance-analysis-level-header">
        <strong>{title}</strong>
      </header>
      {children}
    </section>
  );
}
