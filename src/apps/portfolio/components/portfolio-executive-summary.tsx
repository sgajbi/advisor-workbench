"use client";

import { buildPortfolioDecisionBrief } from "../portfolio-summary-view-model";
import type { PortfolioWorkspace } from "../types";

export default function PortfolioExecutiveSummary({
  workspace,
}: {
  workspace: PortfolioWorkspace;
}) {
  const brief = buildPortfolioDecisionBrief(workspace);

  return (
    <section className="portfolio-decision-brief" aria-label="Portfolio decision review">
      <div className="portfolio-decision-brief-primary">
        <div>
          <span>Priority review</span>
          <h3>{brief.headline}</h3>
          <p>{brief.support}</p>
        </div>
        <strong>{brief.readiness.percentLabel}</strong>
      </div>

      <div className="portfolio-decision-brief-attention" aria-label="Priority attention items">
        {brief.attentionItems.length ? (
          brief.attentionItems.map((item) => (
            <article key={item.title} className={`portfolio-attention-item portfolio-attention-${item.tone}`}>
              <div className="portfolio-attention-marker" aria-hidden="true">
                {item.tone === "danger" ? "!" : "i"}
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="portfolio-summary-empty-copy">No priority attention items for the selected view.</p>
        )}
      </div>

      <div className="portfolio-decision-brief-rows">
        {brief.rows.map((row) => (
          <div key={row.label} className="portfolio-decision-brief-row">
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            <small>{row.support}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
