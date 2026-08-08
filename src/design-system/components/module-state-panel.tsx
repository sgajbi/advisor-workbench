import type { ReactNode } from "react";

import StateInfoHint from "./state-info-hint";

export default function ModuleStatePanel({
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
    <div className={`module-state-panel module-state-panel-${state}`}>
      <div className="module-state-panel-header">
        <strong role="heading" aria-level={2}>{title}</strong>
        {why ? <StateInfoHint body={why.body} title={why.title} label={why.label} /> : null}
      </div>
      <p>{body}</p>
      {hint ? <span>{hint}</span> : null}
      {action ? <div className="module-state-panel-action">{action}</div> : null}
    </div>
  );
}
