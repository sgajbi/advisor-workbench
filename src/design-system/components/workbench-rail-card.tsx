import { cx } from "../utils/cx";

import Panel from "./panel";

export default function WorkbenchRailCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Panel className={cx("workbench-rail-card", className)}>{children}</Panel>;
}
