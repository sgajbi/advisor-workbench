export type PerformanceWorkspaceMode = "summary" | "analysis" | "evidence";

const WORKSPACE_MODES: Array<{ key: PerformanceWorkspaceMode; label: string }> = [
  { key: "summary", label: "Summary" },
  { key: "analysis", label: "Analysis" },
  { key: "evidence", label: "Evidence" },
];

export default function PerformanceWorkspaceModeSwitch({
  value,
  onChange,
}: {
  value: PerformanceWorkspaceMode;
  onChange: (value: PerformanceWorkspaceMode) => void;
}) {
  return (
    <div className="portfolio-segmented-control" role="tablist" aria-label="Performance workspace mode">
      {WORKSPACE_MODES.map((option) => {
        const isActive = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`portfolio-segmented-control-button${
              isActive ? " portfolio-segmented-control-button-active" : ""
            }`}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
