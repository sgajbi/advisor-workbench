import { Panel, SectionLabel, WorkspaceRail, WorkspaceRailLink } from "@/design-system";
import { buildPerformanceHref } from "../navigation";

export default function PerformanceRail({
  portfolios,
  selectedPortfolioId,
  period,
  detailBasis,
  detailDimension,
  chartFrequency,
  benchmark,
}: {
  portfolios: Array<{
    id: string;
    label: string;
  }>;
  selectedPortfolioId: string | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
  chartFrequency: string;
  benchmark?: string;
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
              href={buildPerformanceHref({
                portfolioId: item.id,
                period,
                detailBasis,
                detailDimension,
                chartFrequency,
                benchmark,
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
