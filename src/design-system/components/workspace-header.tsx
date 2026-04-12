import type { ReactNode } from "react";

import { cx } from "../utils/cx";

import WorkbenchPageHeader from "./workbench-page-header";

export default function WorkspaceHeader({
  title,
  meta,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <WorkbenchPageHeader
      title={title}
      actions={meta ? <div className="workspace-header-meta">{meta}</div> : undefined}
      className={cx("workspace-header", className)}
    />
  );
}
