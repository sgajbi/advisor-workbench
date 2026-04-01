"use client";

import { cx } from "../utils/cx";

export default function DeferredModulePlaceholder({
  title,
  message,
  className,
}: {
  title: string;
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cx("deferred-module-placeholder", "workbench-deferred-placeholder", className)}
      role="status"
      aria-live="polite"
    >
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
