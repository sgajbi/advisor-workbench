"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  Alert,
  Box,
  Button,
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";

import { ingestPortfolioBundle } from "@/features/intake/api";
import { parseIntakeCsvToBundle } from "@/features/intake/csv-parser";
import { getCurrencyLookups, getInstrumentLookups, getPortfolioLookups } from "@/features/intake/lookups-api";
import {
  buildCreatePortfolioPayload,
  buildInstrumentsPayloadFromList,
  buildMarketDataPayloadFromList,
  buildPositionSeedPayloadFromList,
  buildTransactionsPayloadFromList,
  InstrumentInput,
  MarketDataInput,
  PositionInput,
  TransactionInput,
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

  const portfolioLookupQuery = useQuery({
    queryKey: ["intake-lookups", "portfolios"],
    queryFn: getPortfolioLookups,
  });
  const instrumentLookupQuery = useQuery({
    queryKey: ["intake-lookups", "instruments"],
    queryFn: getInstrumentLookups,
  });
  const currencyLookupQuery = useQuery({
    queryKey: ["intake-lookups", "currencies"],
    queryFn: getCurrencyLookups,
  });
  const portfolioOptions = portfolioLookupQuery.data ?? [];
  const instrumentOptions = instrumentLookupQuery.data ?? [];
  const currencyOptions = currencyLookupQuery.data ?? [];

  const readiness = useMemo(() => {
    if (operation === "CREATE_PORTFOLIO") {
      return [portfolioId, baseCurrency, openDate, cifId, advisorId].every((x) => x.trim()) ? 100 : 60;
    }
    if (operation === "ADD_POSITIONS") {
      return positions.length > 0 && positions.every((row) => row.securityId && row.quantity > 0 && row.price > 0)
        ? 100
        : 50;
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
  const portfolioOptionValues = portfolioOptions.map((item) => item.id);
  const instrumentOptionValues = instrumentOptions.map((item) => item.id);
  const currencyOptionValues = currencyOptions.map((item) => item.id);

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
        Execute one intake intent at a time with list-based entity submission and governed selector catalogs.
      </Typography>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {csvSummary ? <Alert severity="info">{csvSummary}</Alert> : null}
      {portfolioLookupQuery.isError || instrumentLookupQuery.isError || currencyLookupQuery.isError ? (
        <Alert severity="warning">Lookup services are unavailable. Manual value entry remains enabled.</Alert>
      ) : null}

      <Paper className="section-card" elevation={0}>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6">Intake Operation</Typography>
            <Chip size="small" color="success" label="PAS Ingestion Live" />
            <Chip size="small" label={`Readiness ${readiness}%`} color={canSubmit ? "success" : "warning"} />
            <Chip
              size="small"
              label={
                operation === "ADD_POSITIONS"
                  ? `${positions.length} position rows`
                  : operation === "ADD_TRANSACTIONS"
                    ? `${transactions.length} transaction rows`
                    : operation === "ADD_INSTRUMENTS"
                      ? `${instruments.length} instrument rows`
                      : operation === "ADD_MARKET_DATA"
                        ? `${marketData.length} market rows`
                        : "portfolio profile"
              }
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              variant="outlined"
              onClick={() => csvInputRef.current?.click()}
              disabled={isSubmitting}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Upload CSV Bundle
            </Button>
            <Button
              variant="contained"
              onClick={submitCurrentOperation}
              disabled={isSubmitting || !canSubmit}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              Submit Operation
            </Button>
            {isSubmitting ? <CircularProgress size={22} /> : null}
          </Stack>
        </Stack>
        <Box sx={{ mt: 1.2 }}>
          <LinearProgress variant="determinate" value={readiness} />
        </Box>
        <Box sx={{ mt: 1, overflowX: "auto", pb: 0.5 }}>
          <ToggleButtonGroup
            exclusive
            value={operation}
            onChange={(_e, next: IntakeOperation | null) => next && setOperation(next)}
            size="small"
            sx={{
              flexWrap: { xs: "nowrap", md: "wrap" },
              gap: 0.6,
              minWidth: { xs: 860, md: "auto" },
            }}
          >
            <ToggleButton value="CREATE_PORTFOLIO">Create Portfolio</ToggleButton>
            <ToggleButton value="ADD_POSITIONS">Add Positions</ToggleButton>
            <ToggleButton value="ADD_TRANSACTIONS">Add Transactions</ToggleButton>
            <ToggleButton value="ADD_INSTRUMENTS">Add Instruments</ToggleButton>
            <ToggleButton value="ADD_MARKET_DATA">Add Market Data</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvSelected} style={{ display: "none" }} />
      </Paper>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {operation.replaceAll("_", " ")} Workspace
            </Typography>
            <Divider sx={{ mb: 1 }} />

            {operation === "CREATE_PORTFOLIO" ? (
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={portfolioOptionValues}
                    value={portfolioId}
                    onInputChange={(_e, value) => setPortfolioId(value)}
                    renderInput={(params) => <TextField {...params} label="Portfolio ID" size="small" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    freeSolo
                    options={currencyOptionValues}
                    value={baseCurrency}
                    onInputChange={(_e, value) => setBaseCurrency(value)}
                    renderInput={(params) => <TextField {...params} label="Base Currency" size="small" />}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Open Date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Risk Exposure" value={riskExposure} onChange={(e) => setRiskExposure(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Time Horizon" value={timeHorizon} onChange={(e) => setTimeHorizon(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Portfolio Type" value={portfolioType} onChange={(e) => setPortfolioType(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Booking Center" value={bookingCenter} onChange={(e) => setBookingCenter(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="CIF ID" value={cifId} onChange={(e) => setCifId(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Advisor ID" value={advisorId} onChange={(e) => setAdvisorId(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} />
                </Grid>
              </Grid>
            ) : null}

            {operation === "ADD_POSITIONS" ? (
              <>
                <Grid container spacing={1.2} sx={{ mb: 1 }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      freeSolo
                      options={portfolioOptionValues}
                      value={portfolioId}
                      onInputChange={(_e, value) => setPortfolioId(value)}
                      renderInput={(params) => <TextField {...params} label="Existing Portfolio ID" size="small" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Autocomplete
                      freeSolo
                      options={currencyOptionValues}
                      value={baseCurrency}
                      onInputChange={(_e, value) => setBaseCurrency(value)}
                      renderInput={(params) => <TextField {...params} label="Base Currency" size="small" />}
                    />
                  </Grid>
                </Grid>
                <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Security</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>ISIN</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Effective Date</TableCell>
                      <TableCell>Txn Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {positions.map((row, index) => (
                      <TableRow key={`pos-${index}`}>
                        <TableCell><Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} size="small" />} /></TableCell>
                        <TableCell><TextField size="small" value={row.instrumentName} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, instrumentName: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.isin} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, isin: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.productType} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, productType: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.quantity} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.price} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.effectiveDate} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, effectiveDate: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.transactionType} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionType: e.target.value } : x)))} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </Box>
                <div className="toolbar">
                  <Button variant="outlined" onClick={() => setPositions((prev) => [...prev, { ...prev[prev.length - 1] }])}>
                    Add Position Row
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setPositions((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
                  >
                    Remove Last Row
                  </Button>
                </div>
              </>
            ) : null}

            {operation === "ADD_TRANSACTIONS" ? (
              <>
                <div className="suite-form-grid">
                  <Autocomplete
                    freeSolo
                    options={portfolioOptionValues}
                    value={portfolioId}
                    onInputChange={(_e, value) => setPortfolioId(value)}
                    renderInput={(params) => <TextField {...params} label="Existing Portfolio ID" size="small" />}
                  />
                  <Autocomplete
                    freeSolo
                    options={currencyOptionValues}
                    value={baseCurrency}
                    onInputChange={(_e, value) => setBaseCurrency(value)}
                    renderInput={(params) => <TextField {...params} label="Base Currency" size="small" />}
                  />
                </div>
                <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Security</TableCell>
                      <TableCell>Txn Type</TableCell>
                      <TableCell>Quantity</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((row, index) => (
                      <TableRow key={`txn-${index}`}>
                        <TableCell><Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} size="small" />} /></TableCell>
                        <TableCell><TextField size="small" value={row.transactionType} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionType: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.quantity} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.price} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.transactionDate} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionDate: e.target.value } : x)))} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </Box>
                <div className="toolbar">
                  <Button variant="outlined" onClick={() => setTransactions((prev) => [...prev, { ...prev[prev.length - 1] }])}>
                    Add Transaction Row
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      setTransactions((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
                    }
                  >
                    Remove Last Row
                  </Button>
                </div>
              </>
            ) : null}

            {operation === "ADD_INSTRUMENTS" ? (
              <>
                <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Security</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>ISIN</TableCell>
                      <TableCell>Currency</TableCell>
                      <TableCell>Product Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {instruments.map((row, index) => (
                      <TableRow key={`ins-${index}`}>
                        <TableCell><Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} size="small" />} /></TableCell>
                        <TableCell><TextField size="small" value={row.name} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.isin} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, isin: e.target.value } : x)))} /></TableCell>
                        <TableCell><Autocomplete freeSolo options={currencyOptionValues} value={row.instrumentCurrency} onInputChange={(_e, value) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, instrumentCurrency: value } : x)))} renderInput={(params) => <TextField {...params} size="small" />} /></TableCell>
                        <TableCell><TextField size="small" value={row.productType} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, productType: e.target.value } : x)))} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </Box>
                <div className="toolbar">
                  <Button variant="outlined" onClick={() => setInstruments((prev) => [...prev, { ...prev[prev.length - 1] }])}>
                    Add Instrument Row
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setInstruments((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
                  >
                    Remove Last Row
                  </Button>
                </div>
              </>
            ) : null}

            {operation === "ADD_MARKET_DATA" ? (
              <>
                <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 680 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Security</TableCell>
                      <TableCell>Price Date</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Currency</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {marketData.map((row, index) => (
                      <TableRow key={`mkt-${index}`}>
                        <TableCell><Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} size="small" />} /></TableCell>
                        <TableCell><TextField size="small" value={row.priceDate} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, priceDate: e.target.value } : x)))} /></TableCell>
                        <TableCell><TextField size="small" value={row.price} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} /></TableCell>
                        <TableCell><Autocomplete freeSolo options={currencyOptionValues} value={row.currency} onInputChange={(_e, value) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, currency: value } : x)))} renderInput={(params) => <TextField {...params} size="small" />} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </Box>
                <div className="toolbar">
                  <Button variant="outlined" onClick={() => setMarketData((prev) => [...prev, { ...prev[prev.length - 1] }])}>
                    Add Market Data Row
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setMarketData((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))}
                  >
                    Remove Last Row
                  </Button>
                </div>
              </>
            ) : null}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6">Private Banking UX Notes</Typography>
            <Typography className="muted" sx={{ mt: 1 }}>
              Each operation owns one responsibility and can be submitted independently without forcing full payload duplication.
            </Typography>
            <Typography className="muted">
              Existing portfolio enrichment flows support list-based row entry for operations teams.
            </Typography>
            <Typography className="muted">
              Selector catalog: {portfolioLookupQuery.isLoading ? "loading portfolios..." : `${portfolioOptions.length} portfolios`},{" "}
              {instrumentLookupQuery.isLoading ? "loading instruments..." : `${instrumentOptions.length} instruments`},{" "}
              {currencyLookupQuery.isLoading ? "loading currencies..." : `${currencyOptions.length} currencies`}.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </main>
  );
}
