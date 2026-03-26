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
  useMediaQuery,
  useTheme,
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

type CatalogState = "manual" | "loading" | "online" | "fallback";

const OPERATION_ORDER: IntakeOperation[] = [
  "CREATE_PORTFOLIO",
  "ADD_POSITIONS",
  "ADD_TRANSACTIONS",
  "ADD_INSTRUMENTS",
  "ADD_MARKET_DATA",
];

const OPERATION_COPY: Record<IntakeOperation, { title: string; objective: string; checkpoint: string }> = {
  CREATE_PORTFOLIO: {
    title: "Create Portfolio Workspace",
    objective: "Define core portfolio profile, mandate context, and ownership attributes.",
    checkpoint: "Portfolio profile is complete and governance attributes are assigned.",
  },
  ADD_POSITIONS: {
    title: "Add Positions Workspace",
    objective: "Capture opening holdings with security, quantity, and valuation references.",
    checkpoint: "Position rows are complete and security identifiers are validated.",
  },
  ADD_TRANSACTIONS: {
    title: "Add Transactions Workspace",
    objective: "Record trade activity with date, quantity, and transaction type context.",
    checkpoint: "Transactions are complete and linked to the target portfolio.",
  },
  ADD_INSTRUMENTS: {
    title: "Add Instruments Workspace",
    objective: "Register reference instrument metadata required for downstream analytics.",
    checkpoint: "Instrument master rows include security ID, ISIN, and product descriptors.",
  },
  ADD_MARKET_DATA: {
    title: "Add Market Data Workspace",
    objective: "Submit price observations required for valuation and performance workflows.",
    checkpoint: "Market data rows have valid security IDs, price dates, and currency tags.",
  },
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim())));
}

function resolveCatalogState(
  enabled: boolean,
  isLoading: boolean,
  hasError: boolean,
  itemCount: number
): CatalogState {
  if (!enabled) {
    return "manual";
  }
  if (isLoading) {
    return "loading";
  }
  if (hasError || itemCount === 0) {
    return "fallback";
  }
  return "online";
}

function catalogLabel(name: string, state: CatalogState, count: number): string {
  if (state === "loading") {
    return `${name} loading`;
  }
  if (state === "online") {
    return `${name} ${count}`;
  }
  if (state === "fallback") {
    return `${name} fallback`;
  }
  return `${name} manual`;
}

function catalogColor(state: CatalogState): "default" | "primary" | "warning" | "success" {
  if (state === "online") {
    return "success";
  }
  if (state === "loading") {
    return "primary";
  }
  if (state === "fallback") {
    return "warning";
  }
  return "default";
}

export default function IntakePage() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [operation, setOperation] = useState<IntakeOperation>("CREATE_PORTFOLIO");
  const [lookupEnabled, setLookupEnabled] = useState(false);
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
    queryFn: async () => await getPortfolioLookups({ cifId, bookingCenter, limit: 500 }),
    enabled: lookupEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const instrumentLookupQuery = useQuery({
    queryKey: ["intake-lookups", "instruments"],
    queryFn: async () => await getInstrumentLookups({ limit: 500 }),
    enabled: lookupEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const currencyLookupQuery = useQuery({
    queryKey: ["intake-lookups", "currencies"],
    queryFn: async () => await getCurrencyLookups({ source: "ALL", limit: 100 }),
    enabled: lookupEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const activeOperationIndex = OPERATION_ORDER.indexOf(operation);

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
  const activeCopy = OPERATION_COPY[operation];
  const fallbackPortfolioIds = useMemo(
    () =>
      unique([
        portfolioId,
        ...positions.map((row) => row.portfolioId),
        ...transactions.map((row) => row.portfolioId),
      ]),
    [portfolioId, positions, transactions]
  );
  const fallbackInstrumentIds = useMemo(
    () =>
      unique([
        ...positions.map((row) => row.securityId),
        ...transactions.map((row) => row.securityId),
        ...instruments.map((row) => row.securityId),
        ...marketData.map((row) => row.securityId),
      ]),
    [instruments, marketData, positions, transactions]
  );
  const fallbackCurrencyCodes = useMemo(
    () =>
      unique([
        baseCurrency,
        ...instruments.map((row) => row.instrumentCurrency),
        ...marketData.map((row) => row.currency),
        "USD",
        "EUR",
        "GBP",
        "SGD",
        "HKD",
      ]),
    [baseCurrency, instruments, marketData]
  );

  const portfolioCatalogState = resolveCatalogState(
    lookupEnabled,
    portfolioLookupQuery.isLoading,
    portfolioLookupQuery.isError,
    portfolioLookupQuery.data?.length ?? 0
  );
  const instrumentCatalogState = resolveCatalogState(
    lookupEnabled,
    instrumentLookupQuery.isLoading,
    instrumentLookupQuery.isError,
    instrumentLookupQuery.data?.length ?? 0
  );
  const currencyCatalogState = resolveCatalogState(
    lookupEnabled,
    currencyLookupQuery.isLoading,
    currencyLookupQuery.isError,
    currencyLookupQuery.data?.length ?? 0
  );
  const hasLookupWarning =
    lookupEnabled &&
    (portfolioCatalogState === "fallback" ||
      instrumentCatalogState === "fallback" ||
      currencyCatalogState === "fallback");
  const catalogSummaryState: CatalogState =
    !lookupEnabled
      ? "manual"
      : portfolioCatalogState === "online" &&
          instrumentCatalogState === "online" &&
          currencyCatalogState === "online"
        ? "online"
        : portfolioCatalogState === "loading" ||
            instrumentCatalogState === "loading" ||
            currencyCatalogState === "loading"
          ? "loading"
          : "fallback";

  const portfolioOptionValues =
    portfolioCatalogState === "online"
      ? unique((portfolioLookupQuery.data ?? []).map((item) => item.id))
      : fallbackPortfolioIds;
  const instrumentOptionValues =
    instrumentCatalogState === "online"
      ? unique((instrumentLookupQuery.data ?? []).map((item) => item.id))
      : fallbackInstrumentIds;
  const currencyOptionValues =
    currencyCatalogState === "online"
      ? unique((currencyLookupQuery.data ?? []).map((item) => item.id))
      : fallbackCurrencyCodes;
  const validationGaps = useMemo(() => {
    if (operation === "CREATE_PORTFOLIO") {
      const gaps: string[] = [];
      if (!portfolioId.trim()) gaps.push("Portfolio ID is required.");
      if (!baseCurrency.trim()) gaps.push("Base currency is required.");
      if (!openDate.trim()) gaps.push("Open date is required.");
      if (!cifId.trim()) gaps.push("CIF ID is required.");
      if (!advisorId.trim()) gaps.push("Advisor ID is required.");
      return gaps;
    }
    if (operation === "ADD_POSITIONS") {
      return positions
        .map((row, index) => {
          if (!row.securityId || row.quantity <= 0 || row.price <= 0) {
            return `Position row ${index + 1} needs security ID, quantity, and price.`;
          }
          return "";
        })
        .filter(Boolean);
    }
    if (operation === "ADD_TRANSACTIONS") {
      return transactions
        .map((row, index) => {
          if (!row.securityId || row.quantity <= 0 || row.price <= 0) {
            return `Transaction row ${index + 1} needs security ID, quantity, and price.`;
          }
          return "";
        })
        .filter(Boolean);
    }
    if (operation === "ADD_INSTRUMENTS") {
      return instruments
        .map((row, index) => {
          if (!row.securityId || !row.name || !row.isin) {
            return `Instrument row ${index + 1} needs security ID, name, and ISIN.`;
          }
          return "";
        })
        .filter(Boolean);
    }
    return marketData
      .map((row, index) => {
        if (!row.securityId || row.price <= 0) {
          return `Market data row ${index + 1} needs security ID and price.`;
        }
        return "";
      })
      .filter(Boolean);
  }, [advisorId, baseCurrency, cifId, instruments, marketData, openDate, operation, portfolioId, positions, transactions]);

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
      <section className="page-header">
        <Typography variant="h4" component="h1" className="page-title">
          Portfolio Intake Operations Console
        </Typography>
        <Typography className="page-subtitle">
          Execute one intake intent at a time with list-based entity submission and governed selector catalogs.
        </Typography>
      </section>

      <Paper className="section-card" elevation={0}>
        <Stack spacing={1}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
            <Box>
              <Typography variant="h6">Workflow Guidance</Typography>
              <Typography className="muted">{activeCopy.objective}</Typography>
            </Box>
            <Chip
              size="small"
              color={canSubmit ? "success" : "warning"}
              label={`Step ${activeOperationIndex + 1} of ${OPERATION_ORDER.length}`}
            />
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} flexWrap="wrap">
            {OPERATION_ORDER.map((item, index) => (
              <Chip
                key={item}
                size="small"
                label={`${index + 1}. ${OPERATION_COPY[item].title.replace(" Workspace", "")}`}
                color={item === operation ? "primary" : "default"}
                variant={item === operation ? "filled" : "outlined"}
              />
            ))}
          </Stack>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
            Checkpoint: {activeCopy.checkpoint}
          </Typography>
          {!canSubmit ? (
            <Alert severity="info">
              {validationGaps.length > 0 ? validationGaps[0] : "Complete required fields before submitting this operation."}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {csvSummary ? <Alert severity="info">{csvSummary}</Alert> : null}
      {hasLookupWarning ? (
        <Alert severity="warning">Selector catalog degraded. Using local fallback suggestions and manual entry.</Alert>
      ) : null}

      <Paper className="section-card" elevation={0}>
        <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6">Intake Operation</Typography>
            <Chip size="small" color="success" label="Ingestion Pipeline Live" />
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
            <Chip
              size="small"
              color={catalogColor(catalogSummaryState)}
              label={
                catalogSummaryState === "online"
                  ? "Selector Catalog Online"
                  : catalogSummaryState === "loading"
                    ? "Selector Catalog Loading"
                    : catalogSummaryState === "fallback"
                      ? "Selector Catalog Fallback"
                      : "Selector Catalog Manual"
              }
            />
            <Chip
              size="small"
              color={catalogColor(portfolioCatalogState)}
              label={catalogLabel("Portfolios", portfolioCatalogState, portfolioOptionValues.length)}
            />
            <Chip
              size="small"
              color={catalogColor(instrumentCatalogState)}
              label={catalogLabel("Instruments", instrumentCatalogState, instrumentOptionValues.length)}
            />
            <Chip
              size="small"
              color={catalogColor(currencyCatalogState)}
              label={catalogLabel("Currencies", currencyCatalogState, currencyOptionValues.length)}
            />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
            <Button
              variant="outlined"
              onClick={() => {
                setLookupEnabled(true);
                void portfolioLookupQuery.refetch();
                void instrumentLookupQuery.refetch();
                void currencyLookupQuery.refetch();
              }}
              disabled={lookupEnabled && (portfolioLookupQuery.isLoading || instrumentLookupQuery.isLoading || currencyLookupQuery.isLoading)}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {lookupEnabled ? "Refresh Selector Catalog" : "Load Selector Catalog"}
            </Button>
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
        <Box sx={{ mt: 1 }}>
          <ToggleButtonGroup
            exclusive
            value={operation}
            onChange={(_e, next: IntakeOperation | null) => next && setOperation(next)}
            size="small"
            sx={{
              width: "100%",
              display: "flex",
              flexWrap: "wrap",
              gap: 0.6,
              "& .MuiToggleButton-root": {
                textAlign: "center",
                whiteSpace: "nowrap",
                flex: {
                  xs: "1 1 100%",
                  sm: "1 1 calc(50% - 8px)",
                  lg: "1 1 calc(20% - 8px)",
                },
              },
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
        <Grid size={{ xs: 12, lg: 9, xl: 10 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {activeCopy.title}
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
                {isSmallScreen ? (
                  <Stack spacing={1}>
                    {positions.map((row, index) => (
                      <Paper key={`pos-${index}`} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                          Position Row {index + 1}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12 }}>
                            <Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} label="Security" size="small" />} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Name" value={row.instrumentName} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, instrumentName: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="ISIN" value={row.isin} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, isin: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Type" value={row.productType} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, productType: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <TextField fullWidth size="small" label="Qty" value={row.quantity} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <TextField fullWidth size="small" label="Price" value={row.price} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Effective Date" value={row.effectiveDate} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, effectiveDate: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Txn Type" value={row.transactionType} onChange={(e) => setPositions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionType: e.target.value } : x)))} />
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
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
                )}
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
                {isSmallScreen ? (
                  <Stack spacing={1}>
                    {transactions.map((row, index) => (
                      <Paper key={`txn-${index}`} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                          Transaction Row {index + 1}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12 }}>
                            <Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} label="Security" size="small" />} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Txn Type" value={row.transactionType} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionType: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <TextField fullWidth size="small" label="Quantity" value={row.quantity} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <TextField fullWidth size="small" label="Price" value={row.price} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Date" value={row.transactionDate} onChange={(e) => setTransactions((prev) => prev.map((x, i) => (i === index ? { ...x, transactionDate: e.target.value } : x)))} />
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
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
                )}
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
                {isSmallScreen ? (
                  <Stack spacing={1}>
                    {instruments.map((row, index) => (
                      <Paper key={`ins-${index}`} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                          Instrument Row {index + 1}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12 }}>
                            <Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} label="Security" size="small" />} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Name" value={row.name} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, name: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="ISIN" value={row.isin} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, isin: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <Autocomplete freeSolo options={currencyOptionValues} value={row.instrumentCurrency} onInputChange={(_e, value) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, instrumentCurrency: value } : x)))} renderInput={(params) => <TextField {...params} label="Currency" size="small" />} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Product Type" value={row.productType} onChange={(e) => setInstruments((prev) => prev.map((x, i) => (i === index ? { ...x, productType: e.target.value } : x)))} />
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
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
                )}
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
                {isSmallScreen ? (
                  <Stack spacing={1}>
                    {marketData.map((row, index) => (
                      <Paper key={`mkt-${index}`} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                          Market Data Row {index + 1}
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 12 }}>
                            <Autocomplete freeSolo options={instrumentOptionValues} value={row.securityId} onInputChange={(_e, value) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, securityId: value } : x)))} renderInput={(params) => <TextField {...params} label="Security" size="small" />} />
                          </Grid>
                          <Grid size={{ xs: 12 }}>
                            <TextField fullWidth size="small" label="Price Date" value={row.priceDate} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, priceDate: e.target.value } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <TextField fullWidth size="small" label="Price" value={row.price} onChange={(e) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, price: Number(e.target.value) || 0 } : x)))} />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Autocomplete freeSolo options={currencyOptionValues} value={row.currency} onInputChange={(_e, value) => setMarketData((prev) => prev.map((x, i) => (i === index ? { ...x, currency: value } : x)))} renderInput={(params) => <TextField {...params} label="Currency" size="small" />} />
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
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
                )}
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

        <Grid size={{ xs: 12, lg: 3, xl: 2 }}>
          <Paper className="section-card" elevation={0}>
            <Typography variant="h6">Private Banking UX Notes</Typography>
            <Typography className="muted" sx={{ mt: 1 }}>
              Each operation owns one responsibility and can be submitted independently without forcing full payload duplication.
            </Typography>
            <Typography className="muted">
              Existing portfolio enrichment flows support list-based row entry for operations teams.
            </Typography>
            <Typography className="muted">
              Selector catalog:{" "}
              {!lookupEnabled
                ? "manual mode active (load catalog for governed suggestions)."
                : `${portfolioOptionValues.length} portfolios, ${instrumentOptionValues.length} instruments, ${currencyOptionValues.length} currencies.`}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </main>
  );
}
