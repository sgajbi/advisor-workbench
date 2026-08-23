"use client";

import { Text, WorkbenchRailCard } from "@/design-system";

import type {
  PortfolioExceptionSummary,
  PortfolioWorkflowAction,
  PortfolioWorkspace,
} from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import PortfolioActionsModule from "../modules/portfolio-actions/portfolio-actions-module";
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
  return (
    <>
      <PortfolioActionsModule actions={actions} />

      <PortfolioReadinessModule
        exceptions={exceptions}
        workspace={workspace}
        showDetailFootnote={showDetailFootnote}
        onOpenException={onOpenException}
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
