export default function LotusSynopsisBand({
  summary,
}: {
  summary: string;
}) {
  return (
    <section
      className="lotus-synopsis-band performance-advisor-brief-synopsis"
      aria-label="Brief synopsis"
    >
      <p className="lotus-synopsis-band-label performance-advisor-brief-eyebrow">
        Executive Synopsis
      </p>
      <p className="lotus-synopsis-band-copy performance-advisor-brief-synopsis-copy">
        {summary}
      </p>
    </section>
  );
}
