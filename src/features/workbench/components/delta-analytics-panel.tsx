import {
  AnalyticsGroupBy,
  buildDeltaAnalyticsRows,
} from "../analytics";
import {
  WorkbenchPositionView,
  WorkbenchProjectedPositionView,
} from "../types";

type Props = {
  currentPositions: WorkbenchPositionView[];
  projectedPositions: WorkbenchProjectedPositionView[];
  groupBy: AnalyticsGroupBy;
};

export default function DeltaAnalyticsPanel(props: Props) {
  const rows = buildDeltaAnalyticsRows(
    props.currentPositions,
    props.projectedPositions,
    props.groupBy
  );

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
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td align="right">{row.baselineQuantity.toFixed(4)}</td>
                  <td align="right">{row.proposedQuantity.toFixed(4)}</td>
                  <td align="right">{row.deltaQuantity.toFixed(4)}</td>
                  <td align="right">{row.baselineWeightPct.toFixed(2)}%</td>
                  <td align="right">{row.proposedWeightPct.toFixed(2)}%</td>
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
