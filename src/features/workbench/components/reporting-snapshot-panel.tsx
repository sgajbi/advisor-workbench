"use client";

import { Paper, Typography } from "@mui/material";

type Props = {
  asOfDate: string;
  sourceService: string;
  rows: Array<Record<string, unknown>>;
};

function renderValue(value: unknown): string {
  if (typeof value === "number") {
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "N/A";
  }
  return JSON.stringify(value);
}

export default function ReportingSnapshotPanel(props: Props) {
  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Reporting Snapshot
      </Typography>
      <Typography className="muted" sx={{ mb: 1 }}>
        As of {props.asOfDate}. Source: {props.sourceService}
      </Typography>
      {props.rows.length === 0 ? (
        <p className="muted">No report rows were returned by the reporting service.</p>
      ) : (
        <div className="table-wrap">
          <table className="position-table">
            <thead>
              <tr>
                <th align="left">Bucket</th>
                <th align="left">Metric</th>
                <th align="right">Value</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row, index) => (
                <tr key={`${String(row.bucket ?? "row")}-${String(row.metric ?? index)}-${index}`}>
                  <td>{renderValue(row.bucket ?? row.dimension ?? "TOTAL")}</td>
                  <td>{renderValue(row.metric ?? row.name ?? "value")}</td>
                  <td align="right">{renderValue(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Paper>
  );
}
