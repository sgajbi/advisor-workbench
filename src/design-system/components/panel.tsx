import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "../utils/cx";

export default function Panel({
  children,
  className,
  id,
  surface = "primary",
  density = "default",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  surface?: "primary" | "secondary" | "tertiary";
  density?: "default" | "compact" | "dense";
} & HTMLAttributes<HTMLElement>) {
  return (
    <article
      id={id}
      className={cx(
        "section-card",
        "panel-shell",
        `panel-shell-surface-${surface}`,
        `panel-shell-density-${density}`,
        className
      )}
      {...rest}
    >
      {children}
    </article>
  );
}
