"use client";

import { useEffect, useRef, useState } from "react";

import { Text, WorkbenchRailCard } from "@/design-system";

import type {
  PortfolioExceptionSummary,
  PortfolioWorkflowAction,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import PortfolioActionsModule from "../modules/portfolio-actions/portfolio-actions-module";
import PortfolioContextModule from "../modules/portfolio-context/portfolio-context-module";
import PortfolioReadinessModule from "../modules/portfolio-readiness/portfolio-readiness-module";
import { PortfolioEvidenceModule } from "./portfolio-decision-posture";

export default function PortfolioWorkspaceSideRail({
  workspace,
  context,
  exceptions,
  actions,
  showDetailFootnote,
  onOpenException,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  exceptions: PortfolioExceptionSummary[];
  actions: PortfolioWorkflowAction[];
  showDetailFootnote: boolean;
  onOpenException: (exception: PortfolioExceptionSummary) => void;
}) {
  const [copiedContextField, setCopiedContextField] = useState<string | null>(null);
  const copyResetTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const clearCopyResetTimer = () => {
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
      copyResetTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearCopyResetTimer();
    };
  }, []);

  const copyContextValue = async (key: string, value: string | null | undefined) => {
    if (!value) {
      return;
    }

    clearCopyResetTimer();
    try {
      await navigator.clipboard.writeText(value);
      if (!mountedRef.current) {
        return;
      }
      setCopiedContextField(key);
      copyResetTimerRef.current = window.setTimeout(() => {
        copyResetTimerRef.current = null;
        setCopiedContextField((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      if (mountedRef.current) {
        setCopiedContextField(null);
      }
    }
  };

  return (
    <>
      <PortfolioActionsModule actions={actions} />

      <PortfolioReadinessModule
        exceptions={exceptions}
        workspace={workspace}
        showDetailFootnote={showDetailFootnote}
        onOpenException={onOpenException}
      />

      <PortfolioContextModule
        workspace={workspace}
        copiedField={copiedContextField}
        onCopy={copyContextValue}
      />

      <PortfolioEvidenceModule workspace={workspace} context={context} />
    </>
  );
}

export function PortfolioWorkspaceStateSideRail({
  status,
}: {
  status: "loading" | "unavailable";
}) {
  return (
    <WorkbenchRailCard className="portfolio-side-card">
      <div className="portfolio-card-header">
        <Text variant="cardTitle">
          {status === "loading" ? "Portfolio selection" : "If this remains unavailable"}
        </Text>
        <Text variant="secondary">
          {status === "loading"
            ? "Confirming the selected portfolio before review evidence is shown."
            : "Open My book once. If the selection is still unavailable, contact support with the review date and work area—not client data."}
        </Text>
      </div>
    </WorkbenchRailCard>
  );
}
