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
              <SectionLabel>Portfolio context</SectionLabel>
              <h2>Selection unavailable</h2>
            </div>
            <div className="portfolio-rail-list portfolio-rail-list-empty portfolio-selector-list">
              <div className="portfolio-rail-empty portfolio-selector-empty" role="status">
                <strong>Portfolio context could not be confirmed</strong>
                <span>
                  Open My book to retry source-backed portfolio membership. A global list is not
                  substituted when book scope is unavailable.
                </span>
                <ActionLink href="/book">Open My book</ActionLink>
              </div>
            </div>
          </nav>
        </Panel>
      }
      main={
        <>
          <DegradedStatePanel
            label="Workspace"
            title="Portfolio context unavailable"
            status="Source unavailable"
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
          <MetricRow label="Portfolio context" value="Unavailable" />
          <MetricRow label="Performance area" value="Available" />
          <MetricRow label="Operations" value="Available" />
        </SectionBlock>
      }
    />
  );
}
