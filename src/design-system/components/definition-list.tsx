import type { ReactNode } from "react";

import { cx } from "../utils/cx";

export type DefinitionListItem = {
  label: ReactNode;
  value: ReactNode;
  action?: ReactNode;
};

export default function DefinitionList({
  items,
  ariaLabel,
  className,
  rowClassName,
}: {
  items: DefinitionListItem[];
  ariaLabel?: string;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <dl className={cx("workbench-definition-list", className)} aria-label={ariaLabel}>
      {items.map((item, index) => (
        <div key={`${String(item.label)}-${index}`} className={cx("workbench-definition-row", rowClassName)}>
          <dt className="workbench-definition-term">{item.label}</dt>
          <dd className="workbench-definition-description">
            <span className="workbench-definition-value">{item.value}</span>
            {item.action ?? null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
