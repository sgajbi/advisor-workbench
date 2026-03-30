"use client";

import { cx } from "../utils/cx";
import ModuleSkeleton from "./module-skeleton";

export default function WorkbenchLoadingState({
  title,
  message,
  rows = 4,
  chart = false,
  className,
}: {
  title: string;
  message: string;
  rows?: number;
  chart?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("workbench-loading-state", className)} role="status" aria-live="polite">
      <div className="workbench-loading-state-copy">
        <strong>{title}</strong>
        <span>{message}</span>
      </div>
      <ModuleSkeleton rows={rows} chart={chart} />
    </div>
  );
}
