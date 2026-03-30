"use client";

import { cx } from "../utils/cx";

export default function WorkbenchInlineRefreshNote({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={cx("workbench-inline-refresh-note", className)} role="status" aria-live="polite">
      {message}
    </p>
  );
}
