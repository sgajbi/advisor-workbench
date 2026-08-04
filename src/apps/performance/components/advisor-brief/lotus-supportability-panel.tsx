import type { PerformanceAdvisorBriefSupportabilityItem } from "../../advisor-brief-view-model";
import PerformanceSupportabilitySummary from "../performance-supportability-summary";
import PerformanceWorkspaceSection from "../performance-workspace-section";

function isWorkflowPackStateItem(item: PerformanceAdvisorBriefSupportabilityItem): boolean {
  return item.label === "Generation Run" || item.label === "Human Review";
}

export default function LotusSupportabilityPanel({
  items,
  reviewNotes,
  reviewActionForm,
}: {
  items: PerformanceAdvisorBriefSupportabilityItem[];
  reviewNotes: string[];
  reviewActionForm?: React.ReactNode;
}) {
  const readyCount = items.filter((item) => item.tone === "success").length;
  const workflowPackStateItems = items.filter(isWorkflowPackStateItem);
  const reviewItems = items.filter(
    (item) => item.tone !== "success" && !isWorkflowPackStateItem(item)
  );
  const hasVisibleSupportabilityItems =
    workflowPackStateItems.length > 0 || reviewItems.length > 0;

  return (
    <PerformanceWorkspaceSection
      ariaLabel="Advisor brief supportability"
      className="lotus-supportability-panel performance-advisor-brief-supportability-panel"
      headingClassName="performance-advisor-brief-section-heading"
      kicker="Supportability"
      title="Decision support coverage"
    >
      <PerformanceSupportabilitySummary
        className="performance-advisor-brief-supportability-summary"
        items={[
          { label: "Ready modules", value: readyCount },
          { label: "Review items", value: reviewItems.length + reviewNotes.length },
        ]}
      />
      {hasVisibleSupportabilityItems ? (
        <>
          {workflowPackStateItems.length ? (
            <div className="performance-advisor-brief-supportability-grid">
              {workflowPackStateItems.map((item) => (
                <div key={item.label} className="performance-advisor-brief-supportability-row">
                  <div className="performance-advisor-brief-supportability-identity">
                    <span className="performance-advisor-brief-supportability-label">{item.label}</span>
                    {item.detail ? (
                      <span className="performance-advisor-brief-supportability-detail">
                        {item.detail}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`performance-advisor-brief-supportability-state performance-advisor-brief-supportability-state-${item.tone}`}
                  >
                    <span
                      aria-hidden="true"
                      className="performance-advisor-brief-supportability-dot"
                    />
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          {reviewItems.length ? (
            <div className="performance-advisor-brief-supportability-grid">
              {reviewItems.map((item) => (
                <div key={item.label} className="performance-advisor-brief-supportability-row">
                  <div className="performance-advisor-brief-supportability-identity">
                    <span className="performance-advisor-brief-supportability-label">{item.label}</span>
                    {item.detail ? (
                      <span className="performance-advisor-brief-supportability-detail">
                        {item.detail}
                      </span>
                    ) : null}
                  </div>
                  <span
                    className={`performance-advisor-brief-supportability-state performance-advisor-brief-supportability-state-${item.tone}`}
                  >
                    <span
                      aria-hidden="true"
                      className="performance-advisor-brief-supportability-dot"
                    />
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </>
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
      {reviewActionForm}
    </PerformanceWorkspaceSection>
  );
}
