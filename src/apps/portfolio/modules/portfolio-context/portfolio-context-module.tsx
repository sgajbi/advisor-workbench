"use client";

import { ContextCard, WorkbenchRailCard } from "@/design-system";

import type { PortfolioWorkspace } from "../../types";

export default function PortfolioContextModule({
  workspace,
  copiedField,
  onCopy,
}: {
  workspace: PortfolioWorkspace;
  copiedField: string | null;
  onCopy: (key: string, value: string | null | undefined) => void;
}) {
  return (
    <WorkbenchRailCard className="portfolio-side-card portfolio-context-card">
      <ContextCard
        title="Book Context"
        subtitle="Client book identity for this review."
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
              { label: "Booking Centre", value: workspace.portfolio.booking_center_code ?? "N/A" },
            ],
          },
        ]}
      />
    </WorkbenchRailCard>
  );
}
