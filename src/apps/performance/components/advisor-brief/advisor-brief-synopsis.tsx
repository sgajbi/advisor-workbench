export default function AdvisorBriefSynopsis({
  summary,
}: {
  summary: string;
}) {
  return (
    <section className="performance-advisor-brief-synopsis" aria-label="Brief synopsis">
      <p className="performance-advisor-brief-eyebrow">Brief Synopsis</p>
      <p className="performance-advisor-brief-synopsis-copy">{summary}</p>
    </section>
  );
}

