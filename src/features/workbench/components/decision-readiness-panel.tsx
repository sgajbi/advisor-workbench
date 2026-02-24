type Props = {
  hasValuationData: boolean;
  hasAnalytics: boolean;
  hasReporting: boolean;
  hasActiveSandbox: boolean;
  warningCount: number;
  failureCount: number;
  hhiProposed: number | null;
};

function statusLabel(ready: boolean): string {
  return ready ? "READY" : "PENDING";
}

function concentrationSignal(hhiProposed: number | null): string {
  if (hhiProposed === null) {
    return "UNKNOWN";
  }
  if (hhiProposed >= 0.25) {
    return "HIGH";
  }
  if (hhiProposed >= 0.15) {
    return "MEDIUM";
  }
  return "LOW";
}

export default function DecisionReadinessPanel(props: Props) {
  const dataIntegrityReady = props.warningCount === 0 && props.failureCount === 0;
  const riskSignal = concentrationSignal(props.hhiProposed);

  return (
    <section className="section-card">
      <h3>Decision Readiness</h3>
      <p className="muted">
        Backend readiness checks for simulation, advisory review, and execution preparation.
      </p>
      <div className="suite-row">
        <span>Valuation Coverage</span>
        <strong>{statusLabel(props.hasValuationData)}</strong>
      </div>
      <div className="suite-row">
        <span>Analytics Coverage</span>
        <strong>{statusLabel(props.hasAnalytics)}</strong>
      </div>
      <div className="suite-row">
        <span>Reporting Coverage</span>
        <strong>{statusLabel(props.hasReporting)}</strong>
      </div>
      <div className="suite-row">
        <span>Sandbox Session</span>
        <strong>{statusLabel(props.hasActiveSandbox)}</strong>
      </div>
      <div className="suite-row">
        <span>Data Integrity</span>
        <strong>{dataIntegrityReady ? "READY" : "ATTENTION"}</strong>
      </div>
      <div className="suite-row">
        <span>Concentration Signal (HHI)</span>
        <strong>{riskSignal}</strong>
      </div>
    </section>
  );
}
