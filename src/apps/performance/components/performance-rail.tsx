import { Panel, SectionLabel, WorkspaceRail, WorkspaceRailLink } from "@/design-system";

function buildHref({
  portfolioId,
  period,
  detailBasis,
  detailDimension,
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  detailDimension: string;
}) {
  return (
    `/performance?portfolioId=${encodeURIComponent(portfolioId)}` +
    `&period=${encodeURIComponent(period)}` +
    `&detailBasis=${encodeURIComponent(detailBasis)}` +
    `&detailDimension=${encodeURIComponent(detailDimension)}`
  );
}

export default function PerformanceRail({
  portfolios,
  selectedPortfolioId,
  period,
  detailBasis,
  detailDimension,
}: {
  portfolios: Array<{
    id: string;
    label: string;
  }>;
  selectedPortfolioId: string | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
}) {
  return (
    <WorkspaceRail>
      <Panel className="portfolio-rail performance-rail">
        <div className="portfolio-rail-header">
          <SectionLabel>Performance</SectionLabel>
          <h2>Mandates</h2>
        </div>
        <div className="portfolio-rail-list">
          {portfolios.map((item) => (
            <WorkspaceRailLink
              key={item.id}
              href={buildHref({
                portfolioId: item.id,
                period,
                detailBasis,
                detailDimension,
              })}
              title={item.label}
              meta={item.id}
              active={item.id === selectedPortfolioId}
            />
          ))}
        </div>
      </Panel>
    </WorkspaceRail>
  );
}
