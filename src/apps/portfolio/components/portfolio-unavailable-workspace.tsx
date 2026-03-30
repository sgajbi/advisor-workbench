import {
  ActionLink,
  DegradedStatePanel,
  MetricRow,
  Panel,
  SectionLabel,
  StatusChip,
  WorkstationShell,
  WorkspaceGrid,
} from "@/design-system";

import { FALLBACK_WORK_AREAS } from "../workspace-config";

export default function PortfolioUnavailableWorkspace() {
  return (
    <WorkstationShell
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
              <Panel key={area.href} className="portfolio-action-card">
                <div className="portfolio-action-header">
                  <h3>{area.title}</h3>
                  <StatusChip tone="success">{area.value}</StatusChip>
                </div>
                <p className="muted">{area.note}</p>
                <div className="toolbar">
                  <ActionLink href={area.href}>Open {area.title}</ActionLink>
                </div>
              </Panel>
            ))}
          </WorkspaceGrid>
        </>
      }
      side={
        <Panel className="portfolio-side-card">
          <h3>Service State</h3>
          <MetricRow label="Portfolio catalog" value="Unavailable" />
          <MetricRow label="Performance area" value="Available" />
          <MetricRow label="Operations" value="Available" />
        </Panel>
      }
    />
  );
}
