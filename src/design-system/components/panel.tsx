import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "../utils/cx";

export default function Panel({
  children,
  className,
  id,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  id?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <article id={id} className={cx("section-card", className)} {...rest}>
      {children}
    </article>
  );
}
