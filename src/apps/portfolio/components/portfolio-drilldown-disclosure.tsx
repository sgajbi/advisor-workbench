"use client";

import type { ReactNode } from "react";

import { WorkspaceCapabilityPanel } from "@/design-system";
import {
  isRenderableCapability,
  isSupportedCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";

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
        <div>
          <strong>{title}</strong>
          <span>{summary}</span>
        </div>
        <span className="portfolio-disclosure-chevron" aria-hidden="true">▾</span>
      </summary>
      <div className="portfolio-disclosure-content">
        {expanded ? (
          isSupportedCapability(capability) ? (
            children
          ) : (
            <WorkspaceCapabilityPanel
              capability={capability}
              partialTitle={partialTitle}
              unavailableTitle={unavailableTitle}
              body={body}
              hint={hint}
              why={why}
            />
          )
        ) : null}
      </div>
    </details>
  );
}
