import { cx } from "../utils/cx";
import SemanticBadge, { type SemanticBadgeTone } from "./semantic-badge";

export type WorkbenchDecisionBriefAttention = {
  key: string;
  title: string;
  detail: string;
  tone?: "neutral" | "warn" | "danger";
};

export type WorkbenchDecisionBriefFact = {
  label: string;
  value: string;
  support: string;
};

export default function WorkbenchDecisionBrief({
  ariaLabel,
  eyebrow,
  title,
  support,
  score,
  attentionItems,
  facts,
  emptyMessage,
  className,
}: {
  ariaLabel: string;
  eyebrow: string;
  title: string;
  support: string;
  score: {
    label: string;
    value: string;
    tone: SemanticBadgeTone;
  };
  attentionItems: WorkbenchDecisionBriefAttention[];
  facts: WorkbenchDecisionBriefFact[];
  emptyMessage: string;
  className?: string;
}) {
  return (
    <section className={cx("workbench-decision-brief", className)} aria-label={ariaLabel}>
      <div className="workbench-decision-brief-primary">
        <div className="workbench-decision-brief-heading">
          <span>{eyebrow}</span>
          <h3>{title}</h3>
          <p>{support}</p>
        </div>
        <div className="workbench-decision-brief-score">
          <span>{score.label}</span>
          <SemanticBadge tone={score.tone} emphasis="strong">
            {score.value}
          </SemanticBadge>
        </div>
      </div>

      <div className="workbench-decision-brief-attention" aria-label={`${eyebrow} items`}>
        {attentionItems.length ? (
          attentionItems.map((item) => (
            <article
              key={item.key}
              className={cx(
                "workbench-decision-brief-attention-item",
                `workbench-decision-brief-attention-${item.tone ?? "neutral"}`
              )}
            >
              <span className="workbench-decision-brief-marker" aria-hidden="true" />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))
        ) : (
          <p className="workbench-decision-brief-empty">{emptyMessage}</p>
        )}
      </div>

      <dl className="workbench-decision-brief-facts">
        {facts.map((fact) => (
          <div key={fact.label} className="workbench-decision-brief-fact">
            <dt>{fact.label}</dt>
            <dd>
              <strong>{fact.value}</strong>
              <small>{fact.support}</small>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
