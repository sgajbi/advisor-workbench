import { Grid, Paper, Typography } from "@mui/material";

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
      <Grid container spacing={1}>
        <Grid size={{ xs: 12, md: 4 }}>
          <div className="kpi-box">
            <p className="kpi-label">Market Value ({props.baseCurrency})</p>
            <p className="kpi-value">{props.marketValueBase.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          </div>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <div className="kpi-box">
            <p className="kpi-label">Cash Weight</p>
            <p className="kpi-value">{(props.cashWeightPct * 100).toFixed(2)}%</p>
          </div>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <div className="kpi-box">
            <p className="kpi-label">Positions</p>
            <p className="kpi-value">{props.positionCount}</p>
          </div>
        </Grid>
      </Grid>
    </Paper>
  );
}
