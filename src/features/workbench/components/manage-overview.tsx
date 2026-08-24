import type { PortfolioReviewContext } from "@/apps/portfolio/portfolio-screen-navigation";

import {
  ScreenStatePanel,
  SectionBlock,
  SemanticBadge,
  WorkbenchSummaryMetricStrip,
} from "@/design-system";
import type { ManageWorkspaceData } from "@/features/workbench/manage-workspace-data";
import { buildManageOverviewModel } from "@/features/workbench/manage-overview-model";

import ManageOverviewDecisionWorklist from "./manage-overview-decision-worklist";
import styles from "./manage-overview.module.css";

export default function ManageOverview({
  data,
  reviewContext,
}: {
  data: ManageWorkspaceData;
  reviewContext: PortfolioReviewContext;
}) {
  const model = buildManageOverviewModel(data, reviewContext);

  return (
    <SectionBlock
      title="Portfolio Management Decisions"
      subtitle="Review mandate readiness, resolve active attention, and continue the selected rebalance workflow."
      className="manage-overview-panel"
      actions={
        <SemanticBadge tone={model.overviewPostureTone} emphasis="strong">
          {model.overviewPostureLabel}
        </SemanticBadge>
      }
    >
      <PortfolioOperatingSummary summary={model.portfolioSummary} />

      <WorkbenchSummaryMetricStrip
        ariaLabel="Operating posture"
        layout="custom"
        className={styles.postureStrip}
        itemClassName={styles.postureItem}
        items={model.postureItems.map((item) => ({
          key: item.key,
          label: item.label,
          value: <SemanticBadge tone={item.tone}>{item.value}</SemanticBadge>,
          support: item.support,
        }))}
      />

      <ManageOverviewDecisionWorklist
        selectionScopeKey={reviewContext.portfolioId}
        decisions={model.decisionItems}
      />

      {model.blockedSurfaces.length ? (
        <ScreenStatePanel
          kind="partial"
          surface="portfolio"
          title="Some portfolio-management evidence needs attention"
          body={`Areas to review: ${model.blockedSurfaces.join(", ")}.`}
        />
      ) : null}
    </SectionBlock>
  );
}

function PortfolioOperatingSummary({
  summary,
}: {
  summary: ReturnType<typeof buildManageOverviewModel>["portfolioSummary"];
}) {
  return (
    <dl className={styles.portfolioSummary} aria-label="Portfolio operating summary">
      <div>
        <dt>Portfolio value</dt>
        <dd className={styles.financialValue}>
          {summary.marketValue} {summary.currency}
        </dd>
      </div>
      <div>
        <dt>Positions</dt>
        <dd>{summary.positionCount}</dd>
      </div>
      <div>
        <dt>Cash weight</dt>
        <dd>{summary.cashWeight}</dd>
      </div>
      <div>
        <dt>Risk profile</dt>
        <dd>{summary.riskProfile}</dd>
      </div>
    </dl>
  );
}
