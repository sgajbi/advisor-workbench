import Link from "next/link";

type Props = {
  portfolioId: string;
  warningCount: number;
  failureCount: number;
  netDeltaQuantity: number;
};

function readinessState(props: Props): "BLOCKED" | "CAUTION" | "READY" {
  if (props.failureCount > 0) {
    return "BLOCKED";
  }
  if (props.warningCount > 0) {
    return "CAUTION";
  }
  return "READY";
}

function recommendation(state: "BLOCKED" | "CAUTION" | "READY"): string {
  if (state === "BLOCKED") {
    return "Resolve upstream exceptions before generating proposal artifacts.";
  }
  if (state === "CAUTION") {
    return "Review warnings and validate simulation assumptions before submit.";
  }
  return "Proceed to proposal generation and approval workflow.";
}

export default function AdvisorSummaryCard(props: Props) {
  const state = readinessState(props);

  return (
    <section className="section-card">
      <h3>Advisor Summary</h3>
      <div className="suite-row">
        <span>Readiness</span>
        <strong className={`summary-${state.toLowerCase()}`}>{state}</strong>
      </div>
      <div className="suite-row">
        <span>Warnings</span>
        <strong>{props.warningCount}</strong>
      </div>
      <div className="suite-row">
        <span>Failures</span>
        <strong>{props.failureCount}</strong>
      </div>
      <div className="suite-row">
        <span>Net Delta Quantity</span>
        <strong>{props.netDeltaQuantity.toFixed(4)}</strong>
      </div>
      <p className="muted">{recommendation(state)}</p>
      <div className="toolbar">
        <Link
          className="nav-link"
          href={`/proposals/simulate?portfolioId=${encodeURIComponent(props.portfolioId)}`}
        >
          Open Proposal Simulation
        </Link>
        <Link className="nav-link" href="/proposals">
          Open Proposal Workspace
        </Link>
      </div>
    </section>
  );
}
