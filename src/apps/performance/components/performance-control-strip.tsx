import { Panel } from "@/design-system";
import {
  BASIS_OPTIONS,
  PERIOD_OPTIONS,
  buildPerformanceHref,
} from "../navigation";

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
  chartFrequency,
  benchmark,
}: {
  selectedPortfolioId: string | null;
  period: string;
  detailBasis: string;
  detailDimension: string;
  chartFrequency: string;
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
            href={buildPerformanceHref({
              portfolioId,
              period: option,
              detailBasis,
              detailDimension,
              chartFrequency,
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
            href={buildPerformanceHref({
              portfolioId,
              period,
              detailBasis: option,
              detailDimension,
              chartFrequency,
              benchmark,
            })}
            className={`performance-control-option ${option === detailBasis ? "performance-control-option-active" : ""}`}
          >
            {option}
          </a>
        ))}
      </ControlGroup>

    </Panel>
  );
}
