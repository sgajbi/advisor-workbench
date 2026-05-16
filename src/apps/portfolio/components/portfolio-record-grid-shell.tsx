import type { ReactNode } from "react";

type PortfolioRecordGridShellProps = {
  kicker: string;
  title: string;
  description: ReactNode;
  summaryLabel: ReactNode;
  summaryValue: ReactNode;
  searchControl: ReactNode;
  actions: ReactNode;
  children: ReactNode;
};

export default function PortfolioRecordGridShell({
  kicker,
  title,
  description,
  summaryLabel,
  summaryValue,
  searchControl,
  actions,
  children,
}: PortfolioRecordGridShellProps) {
  return (
    <div className="portfolio-grid-module portfolio-record-grid-module">
      <div className="portfolio-record-grid-heading">
        <div>
          <span className="portfolio-record-grid-kicker">{kicker}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="portfolio-record-grid-summary">
          <span>{summaryLabel}</span>
          <strong>{summaryValue}</strong>
        </div>
      </div>

      <div className="portfolio-record-utility-bar">
        {searchControl}
        <div className="portfolio-record-actions">{actions}</div>
      </div>

      {children}
    </div>
  );
}
