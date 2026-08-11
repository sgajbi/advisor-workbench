"use client";

import { useEffect, useRef, useState } from "react";

import {
  ActionLink,
  Text,
  WorkbenchRailCard,
} from "@/design-system";

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
  workspace: PortfolioWorkspace | null;
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

  if (!workspace) {
    return <PortfolioUnavailableSideRail />;
  }

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

function PortfolioUnavailableSideRail() {
  return (
    <WorkbenchRailCard className="portfolio-side-card">
      <div className="portfolio-card-header">
        <Text variant="cardTitle">Available Work Areas</Text>
        <Text variant="secondary">
          Open adjacent portfolio workflows while the main briefing is unavailable.
        </Text>
      </div>
      <div className="toolbar">
        <ActionLink href="/book">Return to My Book</ActionLink>
        <ActionLink href="/performance">Performance</ActionLink>
        <ActionLink href="/workbench">Open Operations</ActionLink>
      </div>
    </WorkbenchRailCard>
  );
}
