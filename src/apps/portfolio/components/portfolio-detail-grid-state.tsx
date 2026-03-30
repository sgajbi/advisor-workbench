"use client";

import type { ReactNode } from "react";

import { WorkspaceStatusPanel } from "@/design-system";

type PortfolioDetailGridStateProps = {
  state: "empty" | "partial" | "error";
  title: string;
  body: string;
  hint?: string;
  actions?: ReactNode;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
};

export default function PortfolioDetailGridState({
  state,
  title,
  body,
  hint,
  actions,
  why,
}: PortfolioDetailGridStateProps) {
  return (
    <div className="portfolio-detail-grid-state">
      <WorkspaceStatusPanel
        state={state}
        title={title}
        body={body}
        hint={hint}
        action={actions}
        why={why}
      />
    </div>
  );
}
