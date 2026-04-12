import type { ReactNode } from "react";

import { cx } from "../utils/cx";

export default function WorkbenchToolbarGroup({
  title,
  children,
  className,
  ariaLabel,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      className={cx("workbench-toolbar-group", className)}
      role="group"
      aria-label={ariaLabel ?? `${title} controls`}
    >
      <span className="workbench-toolbar-group-title">{title}</span>
      <div className="workbench-toolbar-group-fields">{children}</div>
    </section>
  );
}
