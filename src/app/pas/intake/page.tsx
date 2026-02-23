"use client";

import { useMemo, useState } from "react";
import { Alert, Chip, CircularProgress, Paper, Stack, Typography } from "@mui/material";

import { ingestPortfolioBundle } from "@/features/intake/api";
import { PortfolioBundlePayload } from "@/features/intake/types";
import { intakeBatches } from "@/features/suite/mock-data";

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

  const grossAmount = useMemo(() => {
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedQuantity) || !Number.isFinite(parsedPrice)) {
      return 0;
    }
    return parsedQuantity * parsedPrice;
  }, [price, quantity]);

  const canSubmit = portfolioId.trim() && securityId.trim() && Number(quantity) > 0 && Number(price) > 0;

  async function handleCreatePortfolio() {
    if (!canSubmit) {
      setErrorMessage("Provide portfolio, instrument, quantity, and price before submitting.");
      return;
    }

    const transactionId = `TRN_${portfolioId}_${Date.now()}`;
    const payload: PortfolioBundlePayload = {
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

    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const response = await ingestPortfolioBundle(payload);
      const publishedCounts = response.data.published_counts ?? {};
      setSuccessMessage(
        `Portfolio bundle queued. Portfolios: ${publishedCounts.portfolios ?? 0}, Instruments: ${
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

  return (
    <main className="page-container">
      <Typography variant="h4" component="h1" className="page-title">
        Portfolio Intake Workspace
      </Typography>
      <Typography className="page-subtitle">
        Create real PAS portfolios from UI using a bundle ingestion flow through BFF.
      </Typography>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper className="section-card" elevation={0}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="h6" component="h2">
            Intake Channels
          </Typography>
          <Chip size="small" color="success" label="PAS Ingestion Live" />
        </Stack>
        <div className="toolbar">
          <button type="button" className="btn" onClick={handleCreatePortfolio} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? "Submitting..." : "Create Portfolio In PAS"}
          </button>
          {isSubmitting ? <CircularProgress size={18} /> : null}
          <button type="button" className="btn btn-secondary" disabled>
            CSV Upload (next)
          </button>
          <button type="button" className="btn btn-secondary" disabled>
            Excel Upload (next)
          </button>
        </div>
      </Paper>

      <section className="suite-grid">
        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Portfolio + Holding Draft
          </Typography>
          <div className="suite-form-grid">
            <label>
              <span className="field-label">Portfolio ID</span>
              <input className="input" value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Base Currency</span>
              <input className="input" value={baseCurrency} onChange={(event) => setBaseCurrency(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Open Date</span>
              <input className="input" value={openDate} onChange={(event) => setOpenDate(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Risk Exposure</span>
              <input className="input" value={riskExposure} onChange={(event) => setRiskExposure(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Time Horizon</span>
              <input className="input" value={timeHorizon} onChange={(event) => setTimeHorizon(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Portfolio Type</span>
              <input className="input" value={portfolioType} onChange={(event) => setPortfolioType(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Booking Center</span>
              <input className="input" value={bookingCenter} onChange={(event) => setBookingCenter(event.target.value)} />
            </label>
            <label>
              <span className="field-label">CIF ID</span>
              <input className="input" value={cifId} onChange={(event) => setCifId(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Advisor ID</span>
              <input className="input" value={advisorId} onChange={(event) => setAdvisorId(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Portfolio Status</span>
              <input className="input" value={status} onChange={(event) => setStatus(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Security ID</span>
              <input className="input" value={securityId} onChange={(event) => setSecurityId(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Instrument Name</span>
              <input
                className="input"
                value={instrumentName}
                onChange={(event) => setInstrumentName(event.target.value)}
              />
            </label>
            <label>
              <span className="field-label">ISIN</span>
              <input className="input" value={isin} onChange={(event) => setIsin(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Product Type</span>
              <input className="input" value={productType} onChange={(event) => setProductType(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Transaction Type</span>
              <input
                className="input"
                value={transactionType}
                onChange={(event) => setTransactionType(event.target.value)}
              />
            </label>
            <label>
              <span className="field-label">Quantity</span>
              <input className="input" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Price</span>
              <input className="input" value={price} onChange={(event) => setPrice(event.target.value)} />
            </label>
            <label>
              <span className="field-label">Gross Amount</span>
              <input className="input" value={grossAmount.toFixed(2)} readOnly />
            </label>
          </div>
          <div className="toolbar">
            <button type="button" className="btn" onClick={handleCreatePortfolio} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "Submitting..." : "Submit to PAS"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSuccessMessage(null);
                setErrorMessage(null);
              }}
            >
              Clear Messages
            </button>
          </div>
        </Paper>

        <Paper className="section-card suite-panel" elevation={0}>
          <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
            Batch Processing Pipeline
          </Typography>
          {intakeBatches.map((batch) => (
            <div key={batch.batchId} className="suite-row">
              <div>
                <strong>{batch.batchId}</strong>
                <p className="muted">
                  {batch.source} • {batch.portfolioId}
                </p>
              </div>
              <div>
                <p>{batch.status}</p>
                <p className="muted">{batch.records} rows</p>
              </div>
            </div>
          ))}
        </Paper>
      </section>
    </main>
  );
}
