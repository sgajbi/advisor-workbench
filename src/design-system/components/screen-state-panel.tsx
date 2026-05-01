import type { ReactNode } from "react";

import WorkbenchLoadingState from "./workbench-loading-state";
import EmptyStatePanel from "./empty-state-panel";
import ModuleStatePanel from "./module-state-panel";
import { cx } from "../utils/cx";

export type ScreenStateKind =
  | "loading"
  | "empty"
  | "partial"
  | "permission_blocked"
  | "unavailable"
  | "error";

export type ScreenStateSurface = "default" | "portfolio" | "analysis";

export default function ScreenStatePanel({
  kind,
  title,
  body,
  hint,
  action,
  why,
  className,
  surface = "default",
  illustration = false,
  centered = false,
  chart = false,
  rows,
}: {
  kind: ScreenStateKind;
  title: string;
  body: string;
  hint?: string;
  action?: ReactNode;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
  className?: string;
  surface?: ScreenStateSurface;
  illustration?: boolean;
  centered?: boolean;
  chart?: boolean;
  rows?: number;
}) {
  const containerClassName = cx(
    "screen-state-panel",
    `screen-state-panel-${kind}`,
    surface !== "default" && `screen-state-panel-${surface}`,
    surface === "portfolio" && "portfolio-module-state",
    surface === "analysis" && "performance-analysis-state-panel",
    surface === "analysis" && `performance-analysis-state-panel-${kind}`,
    className
  );

  return (
    <div className={containerClassName}>
      {kind === "loading" ? (
        <WorkbenchLoadingState title={title} message={body} chart={chart} rows={rows} />
      ) : shouldRenderModulePanel(kind, surface) ? (
        <ModuleStatePanel
          state={resolveModuleState(kind)}
          title={title}
          body={body}
          hint={hint}
          action={action}
          why={why}
        />
      ) : (
        <EmptyStatePanel
          title={title}
          body={body}
          hint={hint}
          actions={action}
          why={why}
          illustration={illustration}
          centered={centered}
        />
      )}
    </div>
  );
}

function shouldRenderModulePanel(kind: ScreenStateKind, surface: ScreenStateSurface) {
  if (kind === "partial" || kind === "error" || kind === "permission_blocked") {
    return true;
  }

  if (kind === "unavailable" && surface === "analysis") {
    return true;
  }

  return false;
}

function resolveModuleState(kind: ScreenStateKind): "empty" | "partial" | "error" {
  if (kind === "partial") {
    return "partial";
  }

  if (kind === "error" || kind === "permission_blocked") {
    return "error";
  }

  return "empty";
}
