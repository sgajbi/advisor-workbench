import { Panel } from "@/design-system";

import { formatLabel } from "../formatters";

const PERIOD_OPTIONS = ["MTD", "QTD", "YTD", "1Y", "3Y", "5Y"];
const BASIS_OPTIONS = ["NET", "GROSS"];
const DIMENSION_OPTIONS = ["asset_class", "sector", "country"];
const BENCHMARK_OPTIONS = [
  { value: "", label: "No Benchmark" },
  { value: "MODEL_60_40", label: "Model 60/40" },
  { value: "MSCI_ACWI", label: "MSCI ACWI" },
  { value: "BALANCED_GLOBAL", label: "Balanced Global" },
  { value: "S&P500", label: "S&P 500" },
];

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
  const href =
    `/performance?portfolioId=${encodeURIComponent(portfolioId)}` +
    `&period=${encodeURIComponent(period)}` +
    `&detailBasis=${encodeURIComponent(detailBasis)}` +
    `&detailDimension=${encodeURIComponent(detailDimension)}`;
  return benchmark ? `${href}&benchmark=${encodeURIComponent(benchmark)}` : href;
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
  benchmark,
}: {
  selectedPortfolioId: string | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
  benchmark?: string;
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
              benchmark,
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
              benchmark,
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
              benchmark,
            })}
            className={`performance-control-option ${option === detailDimension ? "performance-control-option-active" : ""}`}
          >
            {formatLabel(option)}
          </a>
        ))}
      </ControlGroup>

      <ControlGroup title="Compared To">
        {BENCHMARK_OPTIONS.map((option) => (
          <a
            key={option.value || "none"}
            href={buildHref({
              portfolioId,
              period,
              detailBasis,
              detailDimension,
              benchmark: option.value || undefined,
            })}
            className={`performance-control-option ${((benchmark ?? "") === option.value) ? "performance-control-option-active" : ""}`}
          >
            {option.label}
          </a>
        ))}
      </ControlGroup>
    </Panel>
  );
}
