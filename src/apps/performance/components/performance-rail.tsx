import { Panel, SectionLabel, WorkspaceRail, WorkspaceRailLink } from "@/design-system";

import { formatLabel } from "../formatters";

const PERIOD_OPTIONS = ["MTD", "QTD", "YTD", "1Y", "3Y", "5Y"];
const BASIS_OPTIONS = ["NET", "GROSS"];
const DIMENSION_OPTIONS = ["asset_class", "sector", "country"];
const BENCHMARK_OPTIONS = ["MODEL_60_40", "MSCI_ACWI", "BALANCED_GLOBAL"];

function buildHref({
  portfolioId,
  period,
  detailBasis,
  detailDimension,
  benchmark,
}: {
  portfolioId: string;
  period: string;
  detailBasis: string;
  detailDimension: string;
  benchmark?: string;
}) {
  const baseHref =
    `/performance?portfolioId=${encodeURIComponent(portfolioId)}` +
    `&period=${encodeURIComponent(period)}` +
    `&detailBasis=${encodeURIComponent(detailBasis)}` +
    `&detailDimension=${encodeURIComponent(detailDimension)}`;
  return benchmark ? `${baseHref}&benchmark=${encodeURIComponent(benchmark)}` : baseHref;
}

export default function PerformanceRail({
  portfolios,
  selectedPortfolioId,
  period,
  detailBasis,
  detailDimension,
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
  benchmark?: string;
}) {
  const portfolioId = selectedPortfolioId ?? portfolios[0]?.id ?? "";

  return (
    <WorkspaceRail>
      <Panel className="portfolio-rail performance-rail">
        <div className="portfolio-rail-header">
          <SectionLabel>Performance</SectionLabel>
          <h2>Coverage Set</h2>
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
                benchmark,
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
                  benchmark,
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
                  benchmark,
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
                  benchmark,
                })}
                title={formatLabel(option)}
                active={option === detailDimension}
              />
            ))}
          </div>
        </div>

        <div className="performance-rail-section">
          <SectionLabel>Benchmark</SectionLabel>
          <div className="portfolio-rail-list">
            {BENCHMARK_OPTIONS.map((option) => (
              <WorkspaceRailLink
                key={option}
                href={buildHref({
                  portfolioId,
                  period,
                  detailBasis,
                  detailDimension,
                  benchmark: option,
                })}
                title={option}
                active={option === benchmark}
              />
            ))}
          </div>
        </div>
      </Panel>
    </WorkspaceRail>
  );
}
