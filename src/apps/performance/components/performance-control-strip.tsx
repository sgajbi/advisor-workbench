import { Panel } from "@/design-system";

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

function ControlGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="performance-control-group">
      <span className="performance-control-label">{title}</span>
      <div className="performance-control-options">{children}</div>
    </div>
  );
}

export default function PerformanceControlStrip({
  selectedPortfolioId,
  period,
  detailBasis,
  detailDimension,
}: {
  selectedPortfolioId: string | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
}) {
  const portfolioId = selectedPortfolioId ?? "";

  if (!portfolioId) {
    return null;
  }

  return (
    <Panel className="performance-control-strip">
      <ControlGroup title="Horizon">
        {PERIOD_OPTIONS.map((option) => (
          <a
            key={option}
            href={buildHref({
              portfolioId,
              period: option,
              detailBasis,
              detailDimension,
            })}
            className={`performance-control-option ${option === period ? "performance-control-option-active" : ""}`}
          >
            {option}
          </a>
        ))}
      </ControlGroup>

      <ControlGroup title="Basis">
        {BASIS_OPTIONS.map((option) => (
          <a
            key={option}
            href={buildHref({
              portfolioId,
              period,
              detailBasis: option,
              detailDimension,
            })}
            className={`performance-control-option ${option === detailBasis ? "performance-control-option-active" : ""}`}
          >
            {option}
          </a>
        ))}
      </ControlGroup>

      <ControlGroup title="Breakdown">
        {DIMENSION_OPTIONS.map((option) => (
          <a
            key={option}
            href={buildHref({
              portfolioId,
              period,
              detailBasis,
              detailDimension: option,
            })}
            className={`performance-control-option ${option === detailDimension ? "performance-control-option-active" : ""}`}
          >
            {formatLabel(option)}
          </a>
        ))}
      </ControlGroup>
    </Panel>
  );
}
