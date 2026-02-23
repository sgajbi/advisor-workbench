"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";

import { ingestPortfolioBundle } from "@/features/intake/api";
import { parseIntakeCsvToBundle } from "@/features/intake/csv-parser";
import { PortfolioBundlePayload } from "@/features/intake/types";
import { intakeBatches } from "@/features/suite/mock-data";

type CheckItem = {
  label: string;
  ok: boolean;
};

export default function PasIntakePage() {
  const [portfolioId, setPortfolioId] = useState("PORT_UI_1001");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [openDate, setOpenDate] = useState("2026-01-02");
  const [riskExposure, setRiskExposure] = useState("Medium");
  const [timeHorizon, setTimeHorizon] = useState("Long");
  const [portfolioType, setPortfolioType] = useState("Discretionary");
  const [bookingCenter, setBookingCenter] = useState("Singapore");
  const [cifId, setCifId] = useState("CIF_UI_1001");
  const [advisorId, setAdvisorId] = useState("advisor_1");
  const [status, setStatus] = useState("Active");
  const [securityId, setSecurityId] = useState("SEC_AAPL_UI");
  const [instrumentName, setInstrumentName] = useState("Apple Inc.");
  const [isin, setIsin] = useState("US0378331005");
  const [productType, setProductType] = useState("Equity");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("200");
  const [transactionType, setTransactionType] = useState("BUY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csvSummary, setCsvSummary] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const grossAmount = useMemo(() => {
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedPrice)) {
      return 0;
    }
    return parsedQuantity * parsedPrice;
  }, [price, quantity]);

  const checks: CheckItem[] = useMemo(
    () => [
      { label: "Portfolio ID provided", ok: portfolioId.trim().length > 0 },
      { label: "Instrument mapped", ok: securityId.trim().length > 0 && isin.trim().length > 0 },
      { label: "Trade economics valid", ok: Number(quantity) > 0 && Number(price) > 0 },
      { label: "Client metadata complete", ok: cifId.trim().length > 0 && advisorId.trim().length > 0 },
    ],
    [advisorId, cifId, isin, portfolioId, price, quantity, securityId]
  );
  const readinessPct = Math.round((checks.filter((item) => item.ok).length / checks.length) * 100);
  const canSubmit = readinessPct === 100;

  function buildManualPayload(): PortfolioBundlePayload {
    const transactionId = `TRN_${portfolioId}_${Date.now()}`;
    return {
      sourceSystem: "ADVISOR_WORKBENCH_UI",
      mode: "UPSERT",
      businessDates: [{ businessDate: openDate }],
      portfolios: [
        {
          portfolioId,
          baseCurrency,
          openDate,
          riskExposure,
          investmentTimeHorizon: timeHorizon,
          portfolioType,
          bookingCenter,
          cifId,
          status,
          advisorId,
        },
      ],
      instruments: [
        {
          securityId,
          name: instrumentName,
          isin,
          instrumentCurrency: baseCurrency,
          productType,
          assetClass: productType,
        },
      ],
      transactions: [
        {
          transaction_id: transactionId,
          portfolio_id: portfolioId,
          instrument_id: securityId,
          security_id: securityId,
          transaction_date: `${openDate}T00:00:00Z`,
          transaction_type: transactionType,
          quantity: Number(quantity),
          price: Number(price),
          gross_transaction_amount: grossAmount,
          trade_currency: baseCurrency,
          currency: baseCurrency,
        },
      ],
      marketPrices: [
        {
          securityId,
          priceDate: openDate,
          price: Number(price),
          currency: baseCurrency,
        },
      ],
      fxRates: [],
    };
  }

  async function submitPayload(payload: PortfolioBundlePayload, successPrefix: string) {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const response = await ingestPortfolioBundle(payload);
      const publishedCounts = response.data.published_counts ?? {};
      setSuccessMessage(
        `${successPrefix} Portfolios: ${publishedCounts.portfolios ?? 0}, Instruments: ${
          publishedCounts.instruments ?? 0
        }, Transactions: ${publishedCounts.transactions ?? 0}.`
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown ingestion error";
      setErrorMessage(detail);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreatePortfolio() {
    if (!canSubmit) {
      setErrorMessage("Intake readiness is incomplete. Resolve validation checks before submission.");
      return;
    }
    await submitPayload(buildManualPayload(), "Manual portfolio bundle queued.");
  }

  async function handleCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCsvSummary(null);
    try {
      const csvText = await file.text();
      const payload = parseIntakeCsvToBundle(csvText);
      await submitPayload(payload, `CSV bundle ${file.name} queued.`);
      setCsvSummary(
        `Transactions: ${payload.transactions.length}, Instruments: ${payload.instruments.length}, Portfolio: ${payload.portfolios[0]?.portfolioId ?? "N/A"}`
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown CSV ingestion error";
      setErrorMessage(detail);
    }
  }

  return (
    <main className="page-container">
      <Typography variant="h4" component="h1" className="page-title">
        Portfolio Intake Operations Console
      </Typography>
      <Typography className="page-subtitle">
        Production-grade onboarding for portfolio creation into PAS with governed validation and auditable ingestion.
      </Typography>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {csvSummary ? <Alert severity="info">{csvSummary}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper className="section-card" elevation={0}>
            <Stack direction={{ xs: "column", md: "row" }} alignItems={{ xs: "flex-start", md: "center" }} spacing={1}>
              <Typography variant="h6">Manual Intake Workflow</Typography>
              <Chip label="PAS Ingestion Live" size="small" color="success" />
              <Chip label={`Readiness ${readinessPct}%`} size="small" color={readinessPct === 100 ? "success" : "warning"} />
            </Stack>
            <Box sx={{ mt: 1 }}>
              <LinearProgress variant="determinate" value={readinessPct} />
            </Box>
            <Divider sx={{ my: 1 }} />

            <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
              Portfolio Master Data
            </Typography>
            <div className="suite-form-grid">
              <label>
                <span className="field-label">Portfolio ID</span>
                <input className="input" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Base Currency</span>
                <input className="input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Open Date</span>
                <input className="input" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Risk Exposure</span>
                <input className="input" value={riskExposure} onChange={(e) => setRiskExposure(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Investment Horizon</span>
                <input className="input" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Portfolio Type</span>
                <input className="input" value={portfolioType} onChange={(e) => setPortfolioType(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Booking Center</span>
                <input className="input" value={bookingCenter} onChange={(e) => setBookingCenter(e.target.value)} />
              </label>
              <label>
                <span className="field-label">CIF ID</span>
                <input className="input" value={cifId} onChange={(e) => setCifId(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Advisor ID</span>
                <input className="input" value={advisorId} onChange={(e) => setAdvisorId(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Status</span>
                <input className="input" value={status} onChange={(e) => setStatus(e.target.value)} />
              </label>
            </div>

            <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.8 }}>
              Holding and Trade Capture
            </Typography>
            <div className="suite-form-grid">
              <label>
                <span className="field-label">Security ID</span>
                <input className="input" value={securityId} onChange={(e) => setSecurityId(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Instrument Name</span>
                <input className="input" value={instrumentName} onChange={(e) => setInstrumentName(e.target.value)} />
              </label>
              <label>
                <span className="field-label">ISIN</span>
                <input className="input" value={isin} onChange={(e) => setIsin(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Product Type</span>
                <input className="input" value={productType} onChange={(e) => setProductType(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Transaction Type</span>
                <input className="input" value={transactionType} onChange={(e) => setTransactionType(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Quantity</span>
                <input className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Price</span>
                <input className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
              </label>
              <label>
                <span className="field-label">Gross Amount</span>
                <input className="input" value={grossAmount.toFixed(2)} readOnly />
              </label>
            </div>

            <div className="toolbar">
              <button type="button" className="btn" onClick={handleCreatePortfolio} disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? "Submitting..." : "Submit Manual Bundle"}
              </button>
              {isSubmitting ? <CircularProgress size={18} /> : null}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSuccessMessage(null);
                  setErrorMessage(null);
                  setCsvSummary(null);
                }}
              >
                Clear Alerts
              </button>
            </div>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6">Operational Readiness</Typography>
            <Divider sx={{ my: 1 }} />
            <Stack spacing={0.7}>
              {checks.map((item) => (
                <Stack key={item.label} direction="row" justifyContent="space-between" alignItems="center">
                  <Typography className="muted">{item.label}</Typography>
                  <Chip size="small" color={item.ok ? "success" : "warning"} label={item.ok ? "OK" : "Pending"} />
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Paper className="section-card" elevation={0}>
            <Typography variant="h6">CSV Batch Intake</Typography>
            <Typography className="muted" sx={{ mt: 0.6 }}>
              Use governed CSV template to ingest multiple holdings in one operation.
            </Typography>
            <div className="toolbar">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => csvInputRef.current?.click()}
                disabled={isSubmitting}
              >
                Upload CSV Package
              </button>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvSelected}
                style={{ display: "none" }}
              />
            </div>
            <Typography className="muted" sx={{ fontSize: 12, mt: 0.8 }}>
              Required columns: portfolio_id, base_currency, open_date, risk_exposure, investment_time_horizon,
              portfolio_type, booking_center, cif_id, advisor_id, status, security_id, instrument_name, isin,
              product_type, transaction_type, quantity, price, transaction_date.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper className="section-card" elevation={0}>
        <Typography variant="h6">Ingestion Processing Queue</Typography>
        <Table size="small" sx={{ mt: 1 }}>
          <TableHead>
            <TableRow>
              <TableCell>Batch ID</TableCell>
              <TableCell>Source</TableCell>
              <TableCell>Portfolio</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Rows</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {intakeBatches.map((batch) => (
              <TableRow key={batch.batchId}>
                <TableCell>{batch.batchId}</TableCell>
                <TableCell>{batch.source}</TableCell>
                <TableCell>{batch.portfolioId}</TableCell>
                <TableCell>{batch.status}</TableCell>
                <TableCell align="right">{batch.records}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </main>
  );
}
