"use client";

import { ContextCard, Panel } from "@/design-system";

import { formatDate } from "../../formatters";
import type { PortfolioWorkspace } from "../../types";
import type { PortfolioWorkspaceContext } from "../../view-model";

export default function PortfolioContextModule({
  workspace,
  context,
  copiedField,
  onCopy,
}: {
  workspace: PortfolioWorkspace;
  context: PortfolioWorkspaceContext;
  copiedField: string | null;
  onCopy: (key: string, value: string | null | undefined) => void;
}) {
  return (
    <Panel className="portfolio-side-card portfolio-context-card">
      <ContextCard
        title="Portfolio Context"
        subtitle="Identity and book setup at the current page context."
        groups={[
          {
            key: "identity",
            title: "Identity",
            facts: [
              {
                label: "Portfolio",
                value: workspace.portfolio.portfolio_id,
                action: (
                  <button
                    type="button"
                    className="portfolio-context-copy"
                    aria-label="Copy Portfolio"
                    onClick={() => onCopy("portfolio", workspace.portfolio.portfolio_id)}
                  >
                    {copiedField === "portfolio" ? "Copied" : "Copy"}
                  </button>
                ),
              },
              {
                label: "Client",
                value: workspace.portfolio.client_id ?? "N/A",
                action: workspace.portfolio.client_id ? (
                  <button
                    type="button"
                    className="portfolio-context-copy"
                    aria-label="Copy Client"
                    onClick={() => onCopy("client", workspace.portfolio.client_id)}
                  >
                    {copiedField === "client" ? "Copied" : "Copy"}
                  </button>
                ) : undefined,
              },
              {
                label: "Relationship Manager",
                value: workspace.profile.advisor_id ?? "N/A",
              },
            ],
          },
          {
            key: "setup",
            title: "Book Setup",
            facts: [
              { label: "Base Currency", value: workspace.portfolio.base_currency },
              { label: "Booking Centre", value: workspace.portfolio.booking_center_code ?? "N/A" },
              { label: "Opened", value: formatDate(workspace.profile.open_date) },
              { label: "As of", value: formatDate(context.selectedAsOfDate) },
            ],
          },
        ]}
      />
    </Panel>
  );
}
