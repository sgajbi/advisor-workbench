"use client";

import { type ReactNode, useState } from "react";

import {
  DegradedStatePanel,
  MainWithSideRailLayout,
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
import PortfolioWorkspaceSideRail from "./portfolio-workspace-side-rail";

export default function PortfolioWorkspaceView({
  workspace,
  context,
  toolbar,
}: {
  workspace: PortfolioWorkspace | null;
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
      <MainWithSideRailLayout
        sideDensity="comfortable"
        className="portfolio-layout"
        railClassName="portfolio-rail-shell"
        mainClassName="portfolio-main"
        sideClassName="portfolio-side portfolio-side-wide"
        rail={
          workspace ? (
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
                workspace
                  ? "Review portfolio value, returns, liquidity, exceptions, and the next business action."
                  : "Portfolio context, readiness, and decision support"
              }
            >
              <WorkbenchSectionStack className="portfolio-page-sections">
                {!workspace ? (
                    <DegradedStatePanel
                    title="Portfolio context unavailable"
                    status="Workspace unavailable"
                    actions={[
                      { href: "/performance", label: "Performance" },
                      { href: "/workbench", label: "Open Operations" },
                    ]}
                  >
                    <p className="error-text">We could not load the selected portfolio briefing.</p>
                  </DegradedStatePanel>
                ) : (
                  <>
                    <PortfolioAnalyticalMainColumn
                      summaryHeader={
                        <PortfolioSummaryHeaderSection
                          workspace={workspace}
                          context={context}
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
          <PortfolioWorkspaceSideRail
            workspace={workspace}
            context={context}
            exceptions={exceptionSummaries}
            actions={setupActions}
            showDetailFootnote={false}
            onOpenException={handleOpenException}
          />
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
