import {
  ActionLink,
  DegradedStatePanel,
  MainWithSideRailLayout,
  MetricRow,
  Panel,
  SemanticBadge,
  SectionBlock,
  SectionLabel,
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
        <Panel className="portfolio-rail portfolio-selector-rail">
          <nav aria-label="Portfolio selector">
            <div className="portfolio-rail-header portfolio-selector-header">
              <SectionLabel>Book</SectionLabel>
              <h2>Portfolios</h2>
            </div>
            <div className="portfolio-rail-list portfolio-rail-list-empty portfolio-selector-list">
              <div className="portfolio-rail-empty portfolio-selector-empty" role="status">
                <strong>Portfolio catalog unavailable</strong>
                <span>
                  Client portfolio selection will return when the gateway catalog is available.
                </span>
              </div>
            </div>
          </nav>
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
                actions={<SemanticBadge tone="success">{area.value}</SemanticBadge>}
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
