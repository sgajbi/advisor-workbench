"use client";

import { Paper, Typography } from "@mui/material";

type Props = {
  marketValueBase: number;
  cashWeightPct: number;
  positionCount: number;
  baseCurrency: string;
};

export default function OverviewCards(props: Props) {
  return (
    <Paper className="section-card">
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Portfolio Overview
      </Typography>
      <div className="kpi-grid">
        <div className="kpi-box">
          <p className="kpi-label">Market Value ({props.baseCurrency})</p>
          <p className="kpi-value">{props.marketValueBase.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="kpi-box">
          <p className="kpi-label">Cash Weight</p>
          <p className="kpi-value">{(props.cashWeightPct * 100).toFixed(2)}%</p>
        </div>
        <div className="kpi-box">
          <p className="kpi-label">Positions</p>
          <p className="kpi-value">{props.positionCount}</p>
        </div>
      </div>
    </Paper>
  );
}
