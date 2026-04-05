import type { ReactNode } from "react";

import ScreenStatePanel from "./screen-state-panel";

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
  return (
    <ScreenStatePanel
      kind={state}
      title={title}
      body={body}
      hint={hint}
      action={action}
      why={why}
    />
  );
}
