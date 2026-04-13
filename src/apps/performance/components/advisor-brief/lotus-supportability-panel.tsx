import type { PerformanceAdvisorBriefSupportabilityItem } from "../../advisor-brief-view-model";
import PerformanceSectionHeading from "../performance-section-heading";
import PerformanceSupportabilitySummary from "../performance-supportability-summary";

export default function LotusSupportabilityPanel({
  items,
  reviewNotes,
}: {
  items: PerformanceAdvisorBriefSupportabilityItem[];
  reviewNotes: string[];
}) {
  const readyCount = items.filter((item) => item.tone === "success").length;
  const reviewItems = items.filter((item) => item.tone !== "success");

  return (
    <section
      className="lotus-supportability-panel performance-advisor-brief-supportability-panel"
      aria-label="Advisor brief supportability"
    >
      <PerformanceSectionHeading
        className="performance-advisor-brief-section-heading"
        kicker="Supportability"
        title="Decision support coverage"
      />
      <PerformanceSupportabilitySummary
        className="performance-advisor-brief-supportability-summary"
        items={[
          { label: "Ready modules", value: readyCount },
          { label: "Review items", value: reviewItems.length + reviewNotes.length },
        ]}
      />
      {reviewItems.length ? (
        <div className="performance-advisor-brief-supportability-grid">
          {reviewItems.map((item) => (
            <div key={item.label} className="performance-advisor-brief-supportability-row">
              <span className="performance-advisor-brief-supportability-label">{item.label}</span>
              <span
                className={`performance-advisor-brief-supportability-state performance-advisor-brief-supportability-state-${item.tone}`}
              >
                <span aria-hidden="true" className="performance-advisor-brief-supportability-dot" />
                {item.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="performance-advisor-brief-supportability-all-ready">
          All current brief dependencies are ready for the selected context.
        </div>
      )}
      {reviewNotes.length ? (
        <div className="performance-advisor-brief-supportability-notes">
          {reviewNotes.map((note) => (
            <div key={note} className="performance-advisor-brief-supportability-note">
              {note}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
