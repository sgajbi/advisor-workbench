import type { ReactNode } from "react";

import EmptyStatePanel from "./empty-state-panel";
import ModuleStatePanel from "./module-state-panel";

export default function WorkspaceStatusPanel({
  state,
  title,
  body,
  hint,
  action,
  why,
}: {
  state: "empty" | "partial" | "error";
  title: string;
  body: string;
  hint?: string;
  action?: ReactNode;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
}) {
  if (state === "empty") {
    return <EmptyStatePanel title={title} body={body} hint={hint} actions={action} why={why} />;
  }

  return (
    <ModuleStatePanel
      state={state}
      title={title}
      body={body}
      hint={hint}
      action={action}
      why={why}
    />
  );
}
