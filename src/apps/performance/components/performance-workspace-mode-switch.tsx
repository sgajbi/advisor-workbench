import { WorkbenchSegmentedControl } from "@/design-system";

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
    <WorkbenchSegmentedControl
      value={value}
      onChange={onChange}
      options={WORKSPACE_MODES}
      ariaLabel="Performance workspace mode"
      className="performance-workspace-mode-switch"
    />
  );
}
