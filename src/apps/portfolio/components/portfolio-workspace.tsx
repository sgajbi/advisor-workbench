"use client";

import { type ReactNode, useState } from "react";

import {
  DegradedStatePanel,
  MainWithSideRailLayout,
  ScreenStatePanel,
  WorkbenchPageFrame,
  WorkbenchSectionStack,
} from "@/design-system";

import type { PortfolioWorkspace } from "../types";
import type { PortfolioWorkspaceContext } from "../view-model";
import {
  getPositionsNeedingPricing,
} from "../view-model";
import PortfolioAnalyticalMainColumn from "./portfolio-analytical-main-column";
import PortfolioDetailDrawerController from "./portfolio-detail-drawer-controller";
import PortfolioExceptionsSection from "./portfolio-exceptions-section";
import {
  buildExceptionDrawer,
  buildMetricDrawer,
  type PortfolioDetailDrawerState,
} from "./portfolio-detail-drawer-builders";
import PortfolioReviewDecisionBrief from "./portfolio-review-decision-brief";
import PortfolioScreenRail from "./portfolio-screen-rail";
import PortfolioSummaryHeaderSection from "./portfolio-summary-header-section";
import PortfolioWorkspaceSideRail, {
  PortfolioWorkspaceStateSideRail,
} from "./portfolio-workspace-side-rail";

export default function PortfolioWorkspaceView({
  workspace,
  workspaceStatus = workspace ? "ready" : "unavailable",
  context,
  toolbar,
}: {
  workspace: PortfolioWorkspace | null;
  workspaceStatus?: "loading" | "ready" | "unavailable";
  context: PortfolioWorkspaceContext;
  toolbar?: ReactNode;
}) {
  const [detailDrawer, setDetailDrawer] = useState<PortfolioDetailDrawerState | null>(null);
  const setupActions = workspace?.workflow_actions ?? [];
  const exceptionSummaries = workspace?.exception_summaries ?? [];

  const handlePricingExceptionDrilldown = () => {
    if (!workspace) {
      return;
    }

    const affectedPositions = getPositionsNeedingPricing(workspace);
    if (!affectedPositions.length) {
      return;
    }

    const pricingException = exceptionSummaries.find((item) => item.key === "pricing");
    if (pricingException) {
      setDetailDrawer(buildExceptionDrawer(pricingException, workspace, context, affectedPositions));
    }
  };

  const handleOpenException = (exception: {
    key: string;
    title: string;
    detail: string;
    tone: "neutral" | "success" | "warn" | "danger";
    href: string;
  }) => {
    if (exception.key === "pricing") {
      handlePricingExceptionDrilldown();
      return;
    }

    if (workspace) {
      setDetailDrawer(buildExceptionDrawer(exception, workspace, context));
    }
  };

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {workspaceStatus === "loading"
          ? "Confirming the selected portfolio."
          : workspaceStatus === "unavailable"
            ? "The selected portfolio is unavailable. Open My book to choose an available portfolio."
            : "Portfolio review available."}
      </p>
      <MainWithSideRailLayout
        sideDensity="comfortable"
        className="portfolio-layout"
        railClassName="portfolio-rail-shell"
        mainClassName="portfolio-main"
        sideClassName="portfolio-side portfolio-side-wide"
        rail={
          workspaceStatus === "ready" && workspace ? (
            <PortfolioScreenRail portfolioId={workspace.portfolio.portfolio_id} activeScreen="portfolio" />
          ) : null
        }
        main={
          <>
            <WorkbenchPageFrame
              className="portfolio-page-frame"
              bodyClassName="portfolio-page-frame-body"
              title="Portfolio Review"
              subtitle={
                workspaceStatus === "loading"
                  ? "Confirming the selected portfolio and current review evidence"
                  : workspace
                  ? "Review portfolio value, returns, liquidity, exceptions, and the next business action."
                  : "Portfolio context, readiness, and decision support"
              }
            >
              <WorkbenchSectionStack className="portfolio-page-sections">
                {workspaceStatus === "loading" ? (
                  <ScreenStatePanel
                    kind="loading"
                    title="Preparing portfolio review"
                    body="Confirming the selected portfolio and loading current review evidence."
                    rows={4}
                  />
                ) : !workspace ? (
                  <div data-testid="portfolio-shell-unavailable">
                    <DegradedStatePanel
                      title="Selected portfolio unavailable"
                      status="Review unavailable"
                      actions={[{ href: "/book", label: "Open My book" }]}
                    >
                      <p className="error-text">
                        We could not confirm this portfolio for review. Open My book to choose an
                        available portfolio; no other portfolio has been substituted.
                      </p>
                    </DegradedStatePanel>
                  </div>
                ) : (
                  <>
                    <PortfolioAnalyticalMainColumn
                      summaryHeader={
                        <PortfolioSummaryHeaderSection
                          workspace={workspace}
                          onOpenMetricDrawer={(metric) =>
                            setDetailDrawer(buildMetricDrawer(metric, workspace, context))
                          }
                        />
                      }
                      toolbar={toolbar}
                      exceptions={<PortfolioExceptionsSection workspace={workspace} />}
                      insights={
                        <PortfolioReviewDecisionBrief workspace={workspace} />
                      }
                    />
                  </>
                )}
              </WorkbenchSectionStack>
            </WorkbenchPageFrame>
          </>
        }
        side={
          workspaceStatus === "ready" && workspace ? (
            <PortfolioWorkspaceSideRail
              workspace={workspace}
              context={context}
              exceptions={exceptionSummaries}
              actions={setupActions}
              showDetailFootnote={false}
              onOpenException={handleOpenException}
            />
          ) : (
            <PortfolioWorkspaceStateSideRail
              status={workspaceStatus === "loading" ? "loading" : "unavailable"}
            />
          )
        }
      />

      <PortfolioDetailDrawerController
        detailDrawer={detailDrawer}
        onClose={() => {
          setDetailDrawer(null);
        }}
      />
    </>
  );
}
