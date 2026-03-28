import { Panel, WorkspaceRail, WorkspaceRailLink } from "@/design-system";

import type { PortfolioCatalogItem } from "../types";

export default function PortfolioRail({
  portfolios,
  selectedPortfolioId,
}: {
  portfolios: PortfolioCatalogItem[];
  selectedPortfolioId: string | null;
}) {
  return (
    <WorkspaceRail>
      <Panel className="portfolio-rail">
        <div className="portfolio-rail-header">
          <div className="portfolio-rail-kicker">Relationship Book</div>
          <h2>Client Portfolios</h2>
        </div>
        <div className="portfolio-rail-list">
          {portfolios.map((item) => (
            <WorkspaceRailLink
              key={item.portfolio_id}
              href={`/portfolio?portfolioId=${encodeURIComponent(item.portfolio_id)}`}
              title={item.display_name}
              meta={item.display_name !== item.portfolio_id ? item.portfolio_id : undefined}
              detail={
                <>
                  {item.base_currency}
                  {item.booking_center_code ? ` · ${item.booking_center_code}` : ""}
                </>
              }
              active={item.portfolio_id === selectedPortfolioId}
            />
          ))}
        </div>
      </Panel>
    </WorkspaceRail>
  );
}
