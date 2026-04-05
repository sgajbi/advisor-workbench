import {
  ActionLink,
  DegradedStatePanel,
  MainWithSideRailLayout,
  MetricRow,
  Panel,
  SectionBlock,
  SectionLabel,
  StatusChip,
  WorkspaceGrid,
} from "@/design-system";

import { FALLBACK_WORK_AREAS } from "../workspace-config";

export default function PortfolioUnavailableWorkspace() {
  return (
    <MainWithSideRailLayout
      className="portfolio-layout-empty"
      railClassName="portfolio-rail-shell"
      mainClassName="portfolio-main"
      sideClassName="portfolio-side"
      rail={
        <Panel className="portfolio-rail">
          <div className="portfolio-rail-header">
            <SectionLabel>Book</SectionLabel>
            <h2>Portfolios</h2>
          </div>
          <div className="portfolio-rail-list portfolio-rail-list-empty">
            <div className="portfolio-rail-empty">
              <strong>Catalog unavailable</strong>
              <span>Upstream portfolio data is not responding.</span>
            </div>
          </div>
        </Panel>
      }
      main={
        <>
          <DegradedStatePanel
            label="Workspace"
            title="Portfolio unavailable"
            status="Core feed unavailable"
          />

          <WorkspaceGrid className="portfolio-action-grid">
            {FALLBACK_WORK_AREAS.map((area) => (
              <SectionBlock
                key={area.href}
                className="portfolio-action-card"
                title={area.title}
                actions={<StatusChip tone="success">{area.value}</StatusChip>}
              >
                <p className="muted">{area.note}</p>
                <div className="toolbar">
                  <ActionLink href={area.href}>Open {area.title}</ActionLink>
                </div>
              </SectionBlock>
            ))}
          </WorkspaceGrid>
        </>
      }
      side={
        <SectionBlock className="portfolio-side-card" title="Service State">
          <MetricRow label="Portfolio catalog" value="Unavailable" />
          <MetricRow label="Performance area" value="Available" />
          <MetricRow label="Operations" value="Available" />
        </SectionBlock>
      }
    />
  );
}
