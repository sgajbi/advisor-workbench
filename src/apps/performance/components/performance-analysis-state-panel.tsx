import { ModuleStatePanel } from "@/design-system";

import { cx } from "@/design-system/utils/cx";

export default function PerformanceAnalysisStatePanel({
  state,
  title,
  body,
  hint,
  className,
}: {
  state: "loading" | "partial" | "unavailable";
  title: string;
  body: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "performance-analysis-state-panel",
        `performance-analysis-state-panel-${state}`,
        className
      )}
    >
      <ModuleStatePanel
        state={state === "partial" ? "partial" : "empty"}
        title={title}
        body={body}
        hint={hint}
      />
    </div>
  );
}
