"use client";

import type { ReactNode } from "react";

import {
  isRenderableCapability,
  isSupportedCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";
import PortfolioModuleState from "./portfolio-module-state";

type PortfolioDrilldownDisclosureProps = {
  title: string;
  summary: string;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  capability: WorkspaceCapability;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  hint?: string;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
  children: ReactNode;
};

export default function PortfolioDrilldownDisclosure({
  title,
  summary,
  expanded,
  onToggle,
  capability,
  partialTitle,
  unavailableTitle,
  body,
  hint,
  why,
  children,
}: PortfolioDrilldownDisclosureProps) {
  if (!isRenderableCapability(capability)) {
    return null;
  }

  return (
    <details
      className="portfolio-disclosure"
      open={expanded}
      onToggle={(event) => onToggle((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>
        <div className="portfolio-disclosure-header">
          <div className="portfolio-disclosure-heading">
            <strong>{title}</strong>
            <span>{summary}</span>
          </div>
          <span className="portfolio-disclosure-action-copy">
            {expanded ? "Collapse detail" : "Open detail"}
          </span>
        </div>
        <div className="portfolio-disclosure-toggle" aria-hidden="true">
          <span className="portfolio-disclosure-toggle-label">
            {expanded ? "Collapse" : "Expand"}
          </span>
          <span className="portfolio-disclosure-chevron">▾</span>
        </div>
      </summary>
      <div className="portfolio-disclosure-content">
        {expanded ? (
          isSupportedCapability(capability) ? (
            children
          ) : (
            <PortfolioModuleState
              variant="capability"
              capability={capability}
              partialTitle={partialTitle}
              unavailableTitle={unavailableTitle}
              body={body}
              partialHint={hint}
              unavailableHint={hint}
              why={why}
            />
          )
        ) : null}
      </div>
    </details>
  );
}
