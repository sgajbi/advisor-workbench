"use client";

import type { ReactNode } from "react";

import {
  CapabilityStatePanel,
  ScreenStatePanel,
  WorkbenchLoadingState,
} from "@/design-system";
import {
  isRenderableCapability,
  type WorkspaceCapability,
} from "@/shell/workspace-capabilities";

type PortfolioModuleStateProps =
  | {
      variant: "loading";
      title: string;
      message: string;
      chart?: boolean;
      rows?: number;
      className?: string;
    }
  | {
      variant: "capability";
      capability: WorkspaceCapability;
      partialTitle: string;
      unavailableTitle: string;
      body: string;
      partialHint?: string;
      unavailableHint?: string;
      why?: {
        body: string;
        title?: string;
        label?: string;
      };
      illustration?: boolean;
      centered?: boolean;
      className?: string;
    }
  | {
      variant: "status";
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
      className?: string;
    };

export default function PortfolioModuleState(props: PortfolioModuleStateProps) {
  const classes = ["portfolio-module-state", props.className].filter(Boolean).join(" ");

  if (props.variant === "loading") {
    return (
      <div className={classes}>
        <WorkbenchLoadingState
          title={props.title}
          message={props.message}
          chart={props.chart}
          rows={props.rows}
        />
      </div>
    );
  }

  if (props.variant === "capability") {
    if (!isRenderableCapability(props.capability)) {
      return null;
    }

    return (
      <div className={classes}>
        <CapabilityStatePanel
          capability={props.capability}
          partialTitle={props.partialTitle}
          unavailableTitle={props.unavailableTitle}
          body={props.body}
          partialHint={props.partialHint}
          unavailableHint={props.unavailableHint}
          why={props.why}
          illustration={props.illustration}
          centered={props.centered}
          surface="portfolio"
        />
      </div>
    );
  }

  return (
    <div className={classes}>
      <ScreenStatePanel
        kind={props.state}
        title={props.title}
        body={props.body}
        hint={props.hint}
        action={props.action}
        why={props.why}
        surface="portfolio"
      />
    </div>
  );
}
