import { WorkbenchAnalyticsBucket } from "../types";

type Props = {
  buckets: WorkbenchAnalyticsBucket[];
  groupBy: string;
};

export default function DeltaAnalyticsPanel(props: Props) {
  const rows = props.buckets;

  return (
    <section className="section-card">
      <h3>Delta Analytics ({props.groupBy === "ASSET_CLASS" ? "Asset Class" : "Security"})</h3>
      {rows.length ? (
        <div className="table-wrap">
          <table className="position-table">
            <thead>
              <tr>
                <th align="left">{props.groupBy === "ASSET_CLASS" ? "Asset Class" : "Security"}</th>
                <th align="right">Baseline Qty</th>
                <th align="right">Proposed Qty</th>
                <th align="right">Delta Qty</th>
                <th align="right">Base Wgt %</th>
                <th align="right">Prop Wgt %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bucket_key}>
                  <td>{row.bucket_label}</td>
                  <td align="right">{row.current_quantity.toFixed(4)}</td>
                  <td align="right">{row.proposed_quantity.toFixed(4)}</td>
                  <td align="right">{row.delta_quantity.toFixed(4)}</td>
                  <td align="right">{row.current_weight_pct.toFixed(2)}%</td>
                  <td align="right">{row.proposed_weight_pct.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No analytics deltas available yet.</p>
      )}
    </section>
  );
}
