import { Panel, WorkspaceRailLink } from "@/design-system";

import type { PortfolioCatalogItem } from "../types";

function renderPortfolioDetail(item: PortfolioCatalogItem) {
  return (
    <>
      <span>{item.base_currency}</span>
      {item.booking_center_code ? <span>{item.booking_center_code}</span> : null}
    </>
  );
}

export default function PortfolioRail({
  portfolios,
  selectedPortfolioId,
}: {
  portfolios: PortfolioCatalogItem[];
  selectedPortfolioId: string | null;
}) {
  return (
    <Panel className="portfolio-rail portfolio-selector-rail">
      <nav aria-label="Portfolio selector">
        <div className="portfolio-rail-header portfolio-selector-header">
          <div className="portfolio-rail-kicker portfolio-selector-kicker">Book selector</div>
          <h2>Portfolios</h2>
        </div>
        <ul className="portfolio-rail-list portfolio-selector-list">
          {portfolios.map((item) => (
            <li key={item.portfolio_id} className="portfolio-selector-list-item">
              <WorkspaceRailLink
                href={`/portfolio?portfolioId=${encodeURIComponent(item.portfolio_id)}`}
                title={item.display_name}
                meta={item.display_name !== item.portfolio_id ? item.portfolio_id : undefined}
                detail={renderPortfolioDetail(item)}
                active={item.portfolio_id === selectedPortfolioId}
              />
            </li>
          ))}
        </ul>
      </nav>
    </Panel>
  );
}
