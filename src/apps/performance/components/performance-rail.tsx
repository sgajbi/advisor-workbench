import { Panel, SectionLabel, WorkspaceRail, WorkspaceRailLink } from "@/design-system";

import { formatLabel } from "../formatters";

const PERIOD_OPTIONS = ["MTD", "QTD", "YTD", "1Y", "3Y", "5Y"];
const BASIS_OPTIONS = ["NET", "GROSS"];
const DIMENSION_OPTIONS = ["asset_class", "sector", "country"];

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
  const portfolioId = selectedPortfolioId ?? portfolios[0]?.id ?? "";

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

        <div className="performance-rail-section">
          <SectionLabel>Period</SectionLabel>
          <div className="portfolio-rail-list">
            {PERIOD_OPTIONS.map((option) => (
              <WorkspaceRailLink
                key={option}
                href={buildHref({
                  portfolioId,
                  period: option,
                  detailBasis,
                  detailDimension,
                })}
                title={option}
                active={option === period}
              />
            ))}
          </div>
        </div>

        <div className="performance-rail-section">
          <SectionLabel>Return Basis</SectionLabel>
          <div className="portfolio-rail-list">
            {BASIS_OPTIONS.map((option) => (
              <WorkspaceRailLink
                key={option}
                href={buildHref({
                  portfolioId,
                  period,
                  detailBasis: option,
                  detailDimension,
                })}
                title={option}
                active={option === detailBasis}
              />
            ))}
          </div>
        </div>

        <div className="performance-rail-section">
          <SectionLabel>Breakdown</SectionLabel>
          <div className="portfolio-rail-list">
            {DIMENSION_OPTIONS.map((option) => (
              <WorkspaceRailLink
                key={option}
                href={buildHref({
                  portfolioId,
                  period,
                  detailBasis,
                  detailDimension: option,
                })}
                title={formatLabel(option)}
                active={option === detailDimension}
              />
            ))}
          </div>
        </div>
      </Panel>
    </WorkspaceRail>
  );
}
