import type { ReactNode } from "react";

import { cx } from "../utils/cx";

export default function WorkbenchPageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("workbench-page-container", className)}>{children}</div>;
}
