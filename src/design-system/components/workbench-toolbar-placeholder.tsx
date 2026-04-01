"use client";

import { cx } from "../utils/cx";

export type WorkbenchToolbarPlaceholderField = {
  key: string;
  label: string;
  width?: "default" | "wide" | "period";
};

export default function WorkbenchToolbarPlaceholder({
  fields,
  contextMessage,
  className,
}: {
  fields: WorkbenchToolbarPlaceholderField[];
  contextMessage: string;
  className?: string;
}) {
  return (
    <section
      className={cx("workbench-toolbar-placeholder", className)}
      aria-hidden="true"
    >
      <div className="workbench-toolbar-placeholder-row">
        {fields.map((field) => (
          <div key={field.key} className="workbench-toolbar-placeholder-field">
            <span className="workbench-toolbar-placeholder-label">{field.label}</span>
            <div
              className={cx(
                "workbench-toolbar-placeholder-control",
                field.width === "wide" && "workbench-toolbar-placeholder-control-wide",
                field.width === "period" && "workbench-toolbar-placeholder-control-period"
              )}
            />
          </div>
        ))}
      </div>
      <div className="portfolio-workspace-toolbar-context">
        <span>{contextMessage}</span>
      </div>
    </section>
  );
}
