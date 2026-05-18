"use client";

type Props = {
  approvalBlocked: boolean;
};

export default function DpmWaveRecommendedActionsSection({ approvalBlocked }: Props) {
  return (
    <section className="rebalance-actions-card" aria-labelledby="rebalance-actions-title">
      <div className="rebalance-section-heading">
        <h3 id="rebalance-actions-title">Recommended Actions</h3>
      </div>
      <div className="rebalance-action-list">
        <RecommendedAction
          title="Review rebalance simulation"
          detail="Check proposed allocation changes against mandate drift."
        />
        <RecommendedAction
          title="Resolve mandate attention items"
          detail={
            approvalBlocked
              ? "Clear the open mandate items before approval."
              : "No blocking attention items remain."
          }
        />
        <RecommendedAction
          title="Open evidence pack"
          detail="Review the decision evidence before staging."
        />
      </div>
    </section>
  );
}

function RecommendedAction({ title, detail }: { title: string; detail: string }) {
  return (
    <button className="rebalance-recommended-action" type="button">
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <span className="material-symbols-outlined" aria-hidden="true">
        chevron_right
      </span>
    </button>
  );
}
