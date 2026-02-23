"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { ingestPortfolioBundle } from "@/features/intake/api";
import { parseIntakeCsvToBundle } from "@/features/intake/csv-parser";
import {
  PositionInput,
  TransactionInput,
  InstrumentInput,
  MarketDataInput,
  buildCreatePortfolioPayload,
  buildInstrumentsPayloadFromList,
  buildMarketDataPayloadFromList,
  buildPositionSeedPayloadFromList,
  buildTransactionsPayloadFromList,
} from "@/features/intake/payload-builder";

type IntakeOperation =
  | "CREATE_PORTFOLIO"
  | "ADD_POSITIONS"
  | "ADD_TRANSACTIONS"
  | "ADD_INSTRUMENTS"
  | "ADD_MARKET_DATA";

export default function PasIntakePage() {
  const [operation, setOperation] = useState<IntakeOperation>("CREATE_PORTFOLIO");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csvSummary, setCsvSummary] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

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

  const [positions, setPositions] = useState<PositionInput[]>([
    {
      portfolioId: "PORT_UI_1001",
      baseCurrency: "USD",
      securityId: "SEC_AAPL_UI",
      instrumentName: "Apple Inc.",
      isin: "US0378331005",
      productType: "Equity",
      quantity: 10,
      price: 200,
      effectiveDate: "2026-01-02",
      transactionType: "BUY",
    },
  ]);
  const [transactions, setTransactions] = useState<TransactionInput[]>([
    {
      portfolioId: "PORT_UI_1001",
      baseCurrency: "USD",
      securityId: "SEC_AAPL_UI",
      quantity: 5,
      price: 205,
      transactionDate: "2026-01-03",
      transactionType: "BUY",
    },
  ]);
  const [instruments, setInstruments] = useState<InstrumentInput[]>([
    {
      securityId: "SEC_AAPL_UI",
      name: "Apple Inc.",
      isin: "US0378331005",
      instrumentCurrency: "USD",
      productType: "Equity",
      assetClass: "Equity",
    },
  ]);
  const [marketData, setMarketData] = useState<MarketDataInput[]>([
    {
      securityId: "SEC_AAPL_UI",
      priceDate: "2026-01-03",
      price: 205,
      currency: "USD",
    },
  ]);

  const readiness = useMemo(() => {
    if (operation === "CREATE_PORTFOLIO") {
      return [portfolioId, baseCurrency, openDate, cifId, advisorId].every((x) => x.trim()) ? 100 : 60;
    }
    if (operation === "ADD_POSITIONS") {
      return positions.length > 0 && positions.every((row) => row.securityId && row.quantity > 0 && row.price > 0) ? 100 : 50;
    }
    if (operation === "ADD_TRANSACTIONS") {
      return transactions.length > 0 && transactions.every((row) => row.securityId && row.quantity > 0 && row.price > 0)
        ? 100
        : 50;
    }
    if (operation === "ADD_INSTRUMENTS") {
      return instruments.length > 0 && instruments.every((row) => row.securityId && row.name && row.isin) ? 100 : 50;
    }
    return marketData.length > 0 && marketData.every((row) => row.securityId && row.price > 0) ? 100 : 50;
  }, [advisorId, baseCurrency, cifId, instruments, marketData, openDate, operation, portfolioId, positions, transactions]);

  const canSubmit = readiness === 100;

  async function submitCurrentOperation() {
    if (!canSubmit) {
      setErrorMessage("Complete required list fields before submitting.");
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setCsvSummary(null);
    try {
      const payload =
        operation === "CREATE_PORTFOLIO"
          ? buildCreatePortfolioPayload({
              portfolioId,
              baseCurrency,
              openDate,
              riskExposure,
              investmentTimeHorizon: timeHorizon,
              portfolioType,
              bookingCenter,
              cifId,
              advisorId,
              status,
            })
          : operation === "ADD_POSITIONS"
            ? buildPositionSeedPayloadFromList(portfolioId, baseCurrency, positions)
            : operation === "ADD_TRANSACTIONS"
              ? buildTransactionsPayloadFromList(portfolioId, baseCurrency, transactions)
              : operation === "ADD_INSTRUMENTS"
                ? buildInstrumentsPayloadFromList(instruments)
                : buildMarketDataPayloadFromList(marketData);

      const response = await ingestPortfolioBundle(payload);
      const counts = response.data.published_counts ?? {};
      setSuccessMessage(
        `${operation.replaceAll("_", " ")} queued. Portfolios: ${counts.portfolios ?? 0}, Instruments: ${
          counts.instruments ?? 0
        }, Transactions: ${counts.transactions ?? 0}, MarketPrices: ${counts.market_prices ?? 0}.`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown ingestion error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCsvSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    setCsvSummary(null);
    try {
      const payload = parseIntakeCsvToBundle(await file.text());
      const response = await ingestPortfolioBundle(payload);
      const counts = response.data.published_counts ?? {};
      setSuccessMessage(
        `CSV queued. Portfolios: ${counts.portfolios ?? 0}, Instruments: ${counts.instruments ?? 0}, Transactions: ${
          counts.transactions ?? 0
        }.`
      );
      setCsvSummary(`File: ${file.name}, Transactions: ${payload.transactions.length}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown CSV error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-container">
      <Typography variant="h4" component="h1" className="page-title">
        Portfolio Intake Operations Console
      </Typography>
      <Typography className="page-subtitle">
        Execute exactly one intake intent at a time with list-based entity submission for enterprise operations.
      </Typography>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {csvSummary ? <Alert severity="info">{csvSummary}</Alert> : null}

      <Paper className="section-card" elevation={0}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
          <Typography variant="h6">Intake Operation</Typography>
          <Chip size="small" color="success" label="PAS Ingestion Live" />
          <Chip size="small" label={`Readiness ${readiness}%`} color={canSubmit ? "success" : "warning"} />
        </Stack>
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={readiness} />
        </Box>
        <ToggleButtonGroup
          exclusive
          value={operation}
          onChange={(_e, next: IntakeOperation | null) => next && setOperation(next)}
          size="small"
          sx={{ mt: 1, flexWrap: "wrap", gap: 0.6 }}
        >
          <ToggleButton value="CREATE_PORTFOLIO">Create Portfolio</ToggleButton>
          <ToggleButton value="ADD_POSITIONS">Add Positions</ToggleButton>
          <ToggleButton value="ADD_TRANSACTIONS">Add Transactions</ToggleButton>
          <ToggleButton value="ADD_INSTRUMENTS">Add Instruments</ToggleButton>
          <ToggleButton value="ADD_MARKET_DATA">Add Market Data</ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {operation.replaceAll("_", " ")} Workspace
            </Typography>

            {operation === "CREATE_PORTFOLIO" ? (
              <div className="suite-form-grid">
                <label><span className="field-label">Portfolio ID</span><input className="input" value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)} /></label>
                <label><span className="field-label">Base Currency</span><input className="input" value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} /></label>
                <label><span className="field-label">Open Date</span><input className="input" value={openDate} onChange={(e) => setOpenDate(e.target.value)} /></label>
                <label><span className="field-label">Risk Exposure</span><input className="input" value={riskExposure} onChange={(e) => setRiskExposure(e.target.value)} /></label>
                <label><span className="field-label">Time Horizon</span><input className="input" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} /></label>
                <label><span className="field-label">Portfolio Type</span><input className="input" value={portfolioType} onChange={(e) => setPortfolioType(e.target.value)} /></label>
                <label><span className="field-label">Booking Center</span><input className="input" value={bookingCenter} onChange={(e) => setBookingCenter(e.target.value)} /></label>
                <label><span className="field-label">CIF ID</span><input className="input" value={cifId} onChange={(e) => setCifId(e.target.value)} /></label>
                <label><span className="field-label">Advisor ID</span><input className="input" value={advisorId} onChange={(e) => setAdvisorId(e.target.value)} /></label>
                <label><span className="field-label">Status</span><input className="input" value={status} onChange={(e) => setStatus(e.target.value)} /></label>
              </div>
            ) : null}

            {operation === "ADD_POSITIONS" ? (
              <>
                {positions.map((row, index) => (
                  <div key={`pos-${index}`} className="suite-form-grid">
                    <label><span className="field-label">Security ID</span><input className="input" value={row.securityId} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Instrument Name</span><input className="input" value={row.instrumentName} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, instrumentName: e.target.value } : x)))} /></label>
                    <label><span className="field-label">ISIN</span><input className="input" value={row.isin} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, isin: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Product Type</span><input className="input" value={row.productType} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, productType: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Quantity</span><input className="input" value={row.quantity} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} /></label>
                    <label><span className="field-label">Price</span><input className="input" value={row.price} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></label>
                    <label><span className="field-label">Effective Date</span><input className="input" value={row.effectiveDate} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, effectiveDate: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Transaction Type</span><input className="input" value={row.transactionType} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionType: e.target.value } : x)))} /></label>
                  </div>
                ))}
                <div className="toolbar">
                  <button type="button" className="btn btn-secondary" onClick={() => setPositions((prev) => [...prev, { ...prev[prev.length - 1] }])}>Add Position Row</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setPositions((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}>Remove Last Row</button>
                </div>
              </>
            ) : null}

            {operation === "ADD_TRANSACTIONS" ? (
              <>
                {transactions.map((row, index) => (
                  <div key={`txn-${index}`} className="suite-form-grid">
                    <label><span className="field-label">Security ID</span><input className="input" value={row.securityId} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Transaction Type</span><input className="input" value={row.transactionType} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionType: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Quantity</span><input className="input" value={row.quantity} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} /></label>
                    <label><span className="field-label">Price</span><input className="input" value={row.price} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></label>
                    <label><span className="field-label">Transaction Date</span><input className="input" value={row.transactionDate} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionDate: e.target.value } : x)))} /></label>
                  </div>
                ))}
                <div className="toolbar">
                  <button type="button" className="btn btn-secondary" onClick={() => setTransactions((prev) => [...prev, { ...prev[prev.length - 1] }])}>Add Transaction Row</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setTransactions((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}>Remove Last Row</button>
                </div>
              </>
            ) : null}

            {operation === "ADD_INSTRUMENTS" ? (
              <>
                {instruments.map((row, index) => (
                  <div key={`ins-${index}`} className="suite-form-grid">
                    <label><span className="field-label">Security ID</span><input className="input" value={row.securityId} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Name</span><input className="input" value={row.name} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x)))} /></label>
                    <label><span className="field-label">ISIN</span><input className="input" value={row.isin} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, isin: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Currency</span><input className="input" value={row.instrumentCurrency} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, instrumentCurrency: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Product Type</span><input className="input" value={row.productType} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, productType: e.target.value } : x)))} /></label>
                  </div>
                ))}
                <div className="toolbar">
                  <button type="button" className="btn btn-secondary" onClick={() => setInstruments((prev) => [...prev, { ...prev[prev.length - 1] }])}>Add Instrument Row</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setInstruments((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}>Remove Last Row</button>
                </div>
              </>
            ) : null}

            {operation === "ADD_MARKET_DATA" ? (
              <>
                {marketData.map((row, index) => (
                  <div key={`mkt-${index}`} className="suite-form-grid">
                    <label><span className="field-label">Security ID</span><input className="input" value={row.securityId} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Price Date</span><input className="input" value={row.priceDate} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, priceDate: e.target.value } : x)))} /></label>
                    <label><span className="field-label">Price</span><input className="input" value={row.price} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></label>
                    <label><span className="field-label">Currency</span><input className="input" value={row.currency} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, currency: e.target.value } : x)))} /></label>
                  </div>
                ))}
                <div className="toolbar">
                  <button type="button" className="btn btn-secondary" onClick={() => setMarketData((prev) => [...prev, { ...prev[prev.length - 1] }])}>Add Market Data Row</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setMarketData((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}>Remove Last Row</button>
                </div>
              </>
            ) : null}

            <div className="toolbar">
              <button type="button" className="btn" onClick={submitCurrentOperation} disabled={isSubmitting || !canSubmit}>
                {isSubmitting ? "Submitting..." : "Submit Operation"}
              </button>
              {isSubmitting ? <CircularProgress size={18} /> : null}
              <button type="button" className="btn btn-secondary" onClick={() => csvInputRef.current?.click()} disabled={isSubmitting}>
                Upload CSV Bundle
              </button>
              <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvSelected} style={{ display: "none" }} />
            </div>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6">Private Banking UX Notes</Typography>
            <Typography className="muted" sx={{ mt: 1 }}>
              Each operation owns one responsibility and can be submitted independently without forcing full payload duplication.
            </Typography>
            <Typography className="muted">
              Existing portfolio enrichment flows support list-based row entry for operational teams.
            </Typography>
            <Typography className="muted">
              CSV remains available for bulk bundle ingestion with strict header validation.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </main>
  );
}
