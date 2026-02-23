"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import { Paper, Typography } from "@mui/material";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

type Props = {
  count: number;
};

export default function PositionsGrid(props: Props) {
  const rows = useMemo(
    () =>
      Array.from({ length: Math.max(1, Math.min(props.count, 8)) }).map((_, index) => ({
        instrument_id: `INST_${String(index + 1).padStart(3, "0")}`,
        asset_class: index % 2 === 0 ? "EQUITY" : "FIXED_INCOME",
        weight_pct: Number((3 + index * 1.2).toFixed(2)),
      })),
    [props.count]
  );

  const columns = useMemo<ColDef[]>(
    () => [
      { field: "instrument_id", headerName: "Instrument", flex: 1 },
      { field: "asset_class", headerName: "Asset Class", flex: 1 },
      { field: "weight_pct", headerName: "Weight %", flex: 1 },
    ],
    []
  );

  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Positions
      </Typography>
      <Typography className="muted" sx={{ mb: 1 }}>
        Position count: {props.count}
      </Typography>
      <div className="ag-theme-alpine" style={{ height: 280, width: "100%" }}>
        <AgGridReact rowData={rows} columnDefs={columns} domLayout="normal" />
      </div>
    </Paper>
  );
}
