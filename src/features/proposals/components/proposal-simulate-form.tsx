"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Stack, TextField } from "@mui/material";

import { getRequiredPortfolioBook } from "@/apps/portfolio/api";
import type { PortfolioPositionView } from "@/apps/portfolio/types";
import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import {
  applyAdvisoryWorkspaceDraftAction,
  createAdvisoryWorkspace,
  evaluateAdvisoryWorkspace,
  handoffAdvisoryWorkspace,
} from "../api";
import {
  buildExecutableTradeRows,
  createCashFlowIntent,
  createTradeIntent,
  createTradeIntentFromPosition,
  formatCurrencyValue,
  type ProposalDraftCashFlowIntent,
  type ProposalDraftTradeIntent,
} from "../proposal-draft-preview";
import { buildProposalDraftImpactModel } from "../proposal-draft-currency-authority";
import {
  assessProposalScenarioCashInput,
  PROPOSAL_SCENARIO_CASH_HELP,
  proposalScenarioCashInputSchema,
} from "../proposal-scenario-cash";
import type { AdvisoryWorkspaceEnvelopeResponse, ProposalSimulateResponse } from "../types";
import {
  buildAdvisoryWorkspaceEvaluationResult,
  extractAdvisoryWorkspaceId,
  extractEvaluationSummary,
  extractHandoffProposalId,
  recordValue,
} from "../advisory-workspace-response";
import {
  buildPersistedProposalDraftWorkflowContext,
  buildSimulationProposalWorkflowContext,
} from "../proposal-workflow-context-view-model";
import { buildProposalPortfolioEvidence } from "../proposal-portfolio-evidence";
import { SectionBlock } from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";
import {
  AdviseEvaluationSummaryPanel,
  CashMovementsPanel,
  CurrentPositionsPanel,
  DraftOrderBlotterPanel,
  IndicativeDraftImpactPanel,
  ProposalPortfolioEvidencePanel,
  SavedAdvisoryDraftPanel,
} from "./proposal-builder-domain-panels";
import { usePublishProposalWorkflowContext } from "./proposal-workflow-context";
import styles from "./proposal-simulate-form.module.css";

const schema = z.object({
  idempotencyKey: z.string().min(6, "Draft control key is required"),
  createdBy: z.string().min(1, "Advisor identity is required"),
  proposalTitle: z.string().min(1, "Advisory draft title is required"),
  portfolioId: z.string().trim().min(1, "Portfolio ID is required"),
  asOfDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an advisory date in YYYY-MM-DD format"),
  mandateId: z.string().optional(),
  baseCurrency: z.string().trim().length(3, "Use a three-letter currency code"),
  cashAmount: proposalScenarioCashInputSchema,
});

type FormInput = z.infer<typeof schema>;

const DEFAULT_ADVISORY_AS_OF_DATE = "2026-04-10";
const DEFAULT_CANONICAL_PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";

function createUiIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ui-${crypto.randomUUID()}`;
  }
  return `ui-${Date.now()}`;
}

function simulationHighlights(result: ProposalSimulateResponse): Array<{ label: string; value: string }> {
  const highlights: Array<{ label: string; value: string }> = [];
  Object.entries(result.data).forEach(([key, value]) => {
    if (key === "status" || key === "proposal_run_id") {
      return;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      highlights.push({
        label: key.replaceAll("_", " "),
        value: String(value),
      });
    }
  });
  return highlights.slice(0, 8);
}

function decimalString(value: number, digits: number): string {
  return value.toFixed(digits);
}

function signedCashAmount(item: ProposalDraftCashFlowIntent): string {
  const amount = Math.abs(item.amount || 0);
  return decimalString(item.direction === "OUT" ? -amount : amount, 2);
}

export default function ProposalSimulateForm({
  initialPortfolioId = DEFAULT_CANONICAL_PORTFOLIO_ID,
}: {
  initialPortfolioId?: string;
}) {
  const isHydrated = useClientMounted();
  const [defaultIdempotencyKey] = useState(createUiIdempotencyKey);

  const form = useForm<FormInput>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      idempotencyKey: defaultIdempotencyKey,
      createdBy: "advisor_1",
      proposalTitle: "Tactical rebalance proposal",
      portfolioId: initialPortfolioId,
      asOfDate: DEFAULT_ADVISORY_AS_OF_DATE,
      mandateId:
        initialPortfolioId === "PB_SG_GLOBAL_BAL_001"
          ? "MANDATE_PB_SG_GLOBAL_BAL_001"
          : "",
      baseCurrency: "USD",
      cashAmount: "10000",
    },
  });

  const [cashFlows, setCashFlows] = useState<ProposalDraftCashFlowIntent[]>([
    createCashFlowIntent(1, "USD"),
  ]);
  const [trades, setTrades] = useState<ProposalDraftTradeIntent[]>([
    createTradeIntent(1, "USD"),
  ]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProposalSimulateResponse | null>(null);
  const [workspaceEnvelope, setWorkspaceEnvelope] =
    useState<AdvisoryWorkspaceEnvelopeResponse | null>(null);
  const [evaluatedWorkspaceId, setEvaluatedWorkspaceId] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<{
    proposalId: string;
    portfolioId: string;
  } | null>(null);

  const portfolioId = useWatch({ control: form.control, name: "portfolioId" });
  const asOfDate = useWatch({ control: form.control, name: "asOfDate" });
  const baseCurrency = useWatch({ control: form.control, name: "baseCurrency" });
  const cashAmount = useWatch({ control: form.control, name: "cashAmount" });
  const scenarioCashAdmission = useMemo(
    () => assessProposalScenarioCashInput(cashAmount),
    [cashAmount]
  );
  const evidencePortfolioId = portfolioId.trim();
  const evidenceAsOfDate = asOfDate.trim();
  const evidenceCurrency = baseCurrency.trim().toUpperCase();
  const hasPortfolioEvidenceContext =
    evidencePortfolioId.length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(evidenceAsOfDate) &&
    /^[A-Z]{3}$/.test(evidenceCurrency);
  const workflowContextModel = useMemo(
    () =>
      savedDraft
        ? buildPersistedProposalDraftWorkflowContext(savedDraft)
        : buildSimulationProposalWorkflowContext({ portfolioId }),
    [portfolioId, savedDraft]
  );
  usePublishProposalWorkflowContext(workflowContextModel);
  const portfolioBookQuery = useQuery({
    queryKey: [
      "proposal-position-builder-book",
      evidencePortfolioId,
      evidenceAsOfDate,
      evidenceCurrency,
    ],
    queryFn: async () =>
      await getRequiredPortfolioBook(evidencePortfolioId, {
        asOfDate: evidenceAsOfDate,
        reportingCurrency: evidenceCurrency,
      }),
    enabled: hasPortfolioEvidenceContext,
    ...workbenchStrictQueryDefaults,
  });
  const portfolioEvidence = useMemo(
    () =>
      buildProposalPortfolioEvidence({
        portfolioId: evidencePortfolioId,
        asOfDate: evidenceAsOfDate,
        reportingCurrency: evidenceCurrency,
        bookQuery: {
          data: portfolioBookQuery.data,
          isLoading: portfolioBookQuery.isLoading,
          isFetching: portfolioBookQuery.isFetching,
          error: portfolioBookQuery.error,
        },
        manualCashAmount:
          scenarioCashAdmission.status === "ready" ? scenarioCashAdmission.amount : null,
      }),
    [
      evidenceAsOfDate,
      evidenceCurrency,
      evidencePortfolioId,
      portfolioBookQuery.data,
      portfolioBookQuery.error,
      portfolioBookQuery.isFetching,
      portfolioBookQuery.isLoading,
      scenarioCashAdmission,
    ]
  );
  const tradablePositions = portfolioEvidence.positions.items;
  const sourceCashAmount = portfolioEvidence.cash.amount;
  const draftImpactModel = useMemo(
    () =>
      buildProposalDraftImpactModel({
        positions: tradablePositions,
        cashAmount: sourceCashAmount ?? 0,
        cashFlows,
        trades,
        requestedCurrency: evidenceCurrency,
        portfolioEvidence,
        additionalCashAdmission: scenarioCashAdmission,
      }),
    [
      cashFlows,
      evidenceCurrency,
      portfolioEvidence,
      scenarioCashAdmission,
      sourceCashAmount,
      tradablePositions,
      trades,
    ]
  );
  const sourceBookCurrency = draftImpactModel.currencyAuthority.sourceCurrency;
  const cashEvidenceCurrency =
    portfolioEvidence.cash.authority === "portfolio_book"
      ? sourceBookCurrency
      : draftImpactModel.currencyAuthority.requestedCurrency;
  const executableTradeRows = useMemo(
    () => buildExecutableTradeRows(tradablePositions, trades),
    [tradablePositions, trades]
  );
  const cappedTradeCount = executableTradeRows.filter(
    (item) => item.cappedToAvailableQuantity
  ).length;
  const canRunProposalWorkflow =
    portfolioEvidence.canEvaluateAndHandoff && scenarioCashAdmission.status === "ready";
  const workflowActionReason = !portfolioEvidence.canEvaluateAndHandoff
    ? "Evaluation and draft handoff remain unavailable until the selected portfolio context is confirmed."
    : scenarioCashAdmission.status === "invalid"
      ? "Correct the additional cash assumption before evaluating or saving this draft."
      : "Evaluation uses the source-confirmed portfolio snapshot; the additional cash assumption changes indicative impact only.";

  function updateCashFlow(id: string, patch: Partial<ProposalDraftCashFlowIntent>) {
    setCashFlows((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function updateTrade(id: string, patch: Partial<ProposalDraftTradeIntent>) {
    setTrades((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addCashFlow(currency: string) {
    setCashFlows((current) => [...current, createCashFlowIntent(current.length + 1, currency)]);
  }

  function addTrade() {
    setTrades((current) => [
      ...current,
      createTradeIntent(current.length + 1, evidenceCurrency),
    ]);
  }

  function addPositionTrade(position: PortfolioPositionView, side: "BUY" | "SELL") {
    setTrades((current) => [
      ...current,
      createTradeIntentFromPosition(
        current.length + 1,
        position,
        side,
        sourceBookCurrency ?? ""
      ),
    ]);
  }

  async function refreshPortfolioEvidence() {
    await portfolioBookQuery.refetch({ cancelRefetch: true });
  }

  function confirmPortfolioEvidence(): boolean {
    if (portfolioEvidence.canEvaluateAndHandoff) {
      return true;
    }
    setError(
      "Confirm current portfolio holdings and cash before evaluating or saving this advisor draft."
    );
    return false;
  }

  function netCashImpact(): string {
    const total = cashFlows.reduce((sum, item) => {
      const amount = Math.abs(item.amount || 0);
      return item.direction === "OUT" ? sum - amount : sum + amount;
    }, 0);
    return total.toFixed(2);
  }

  function validTradeCount(): number {
    return executableTradeRows.length;
  }

  function validCashFlowRows(): ProposalDraftCashFlowIntent[] {
    return cashFlows.filter((item) => item.currency.trim().length > 0 && item.amount > 0);
  }

  function validTradeRows() {
    return executableTradeRows;
  }

  function syncEvaluationFromWorkspace(envelope: AdvisoryWorkspaceEnvelopeResponse) {
    const evaluationResult = buildAdvisoryWorkspaceEvaluationResult(envelope);
    if (!evaluationResult) {
      throw new Error(
        "Proposal evaluation returned incomplete evidence. Review the draft and try again."
      );
    }

    setWorkspaceEnvelope(envelope);
    setResult(evaluationResult);
  }

  async function createEvaluatedWorkspace(values: FormInput): Promise<AdvisoryWorkspaceEnvelopeResponse> {
    setEvaluatedWorkspaceId(null);
    setWorkspaceEnvelope(null);
    setResult(null);
    const mandateId = values.mandateId?.trim();
    const workspaceResponse = await createAdvisoryWorkspace({
      body: {
        workspace_name: values.proposalTitle,
        created_by: values.createdBy,
        input_mode: "stateful",
        stateful_input: {
          portfolio_id: values.portfolioId,
          as_of: values.asOfDate,
          ...(mandateId ? { mandate_id: mandateId } : {}),
        },
      },
    });
    const workspaceId = extractAdvisoryWorkspaceId(workspaceResponse);
    if (!workspaceId) {
      throw new Error("Advisory workspace was created without a workspace identifier.");
    }

    let latestResponse = workspaceResponse;

    for (const item of validCashFlowRows()) {
      latestResponse = await applyAdvisoryWorkspaceDraftAction(workspaceId, {
        body: {
          actor_id: values.createdBy,
          action_type: "ADD_CASH_FLOW",
          cash_flow: {
            intent_type: "CASH_FLOW",
            currency: item.currency.toUpperCase(),
            amount: signedCashAmount(item),
            ...(item.description?.trim() ? { description: item.description.trim() } : {}),
          },
        },
      });
    }

    for (const item of validTradeRows()) {
      latestResponse = await applyAdvisoryWorkspaceDraftAction(workspaceId, {
        body: {
          actor_id: values.createdBy,
          action_type: "ADD_TRADE",
          trade: {
            intent_type: "SECURITY_TRADE",
            side: item.side,
            instrument_id: item.instrumentId.trim(),
            quantity: decimalString(item.executableQuantity, 4),
          },
        },
      });
    }

    latestResponse = await evaluateAdvisoryWorkspace(workspaceId);

    syncEvaluationFromWorkspace(latestResponse);
    setEvaluatedWorkspaceId(workspaceId);
    return latestResponse;
  }

  async function onSubmit(values: FormInput) {
    setError(null);
    setSavedDraft(null);
    if (!confirmPortfolioEvidence()) {
      return;
    }
    setLoading(true);
    try {
      await createEvaluatedWorkspace(values);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onSaveDraft() {
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }
    if (!confirmPortfolioEvidence()) {
      return;
    }

    const parsedValues = schema.safeParse(form.getValues());
    if (!parsedValues.success) {
      return;
    }
    const values = parsedValues.data;
    setError(null);
    setSavingDraft(true);
    try {
      const evaluatedWorkspace = await createEvaluatedWorkspace(values);
      const workspaceId = extractAdvisoryWorkspaceId(evaluatedWorkspace);
      if (!workspaceId) {
        throw new Error("Advisory workspace cannot be handed off without a workspace identifier.");
      }
      const handoffResponse = await handoffAdvisoryWorkspace(
        workspaceId,
        {
          body: {
            handoff_by: values.createdBy,
            metadata: {
              title: values.proposalTitle,
              ...(values.mandateId?.trim() ? { mandate_id: values.mandateId.trim() } : {}),
            },
          },
        },
        `${values.idempotencyKey}-handoff`
      );
      const proposalId = extractHandoffProposalId(handoffResponse);
      if (!proposalId) {
        throw new Error("The advisory service retained no proposal identity for this draft.");
      }
      setSavedDraft({ proposalId, portfolioId: values.portfolioId });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setSavingDraft(false);
    }
  }

  let evaluateActionLabel = "Evaluate Workspace";
  if (!isHydrated) {
    evaluateActionLabel = "Preparing Workspace...";
  } else if (loading) {
    evaluateActionLabel = "Evaluating...";
  }

  let saveActionLabel = "Save Advisor Draft";
  if (!isHydrated) {
    saveActionLabel = "Preparing Workspace...";
  } else if (savingDraft) {
    saveActionLabel = "Handing Off...";
  }

  return (
    <SectionBlock
      title="Create Advisory Proposal"
      subtitle="Prepare advisor-use proposal inputs, simulate portfolio impact, and save a governed draft."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
        <Controller
          control={form.control}
          name="idempotencyKey"
          render={({ field }) => <input type="hidden" {...field} />}
        />
        <Controller
          control={form.control}
          name="createdBy"
          render={({ field }) => <input type="hidden" {...field} />}
        />

        <div className={styles.summaryStrip} aria-label="Proposal setup summary">
          <div>
            <span>Portfolio</span>
            <strong>{portfolioId || "Not selected"}</strong>
          </div>
          <div>
            <span>Base Currency</span>
            <strong>{baseCurrency || "N/A"}</strong>
          </div>
          <div>
            <span>Cash Context</span>
            <strong>
              {sourceCashAmount === null
                ? "Needs correction"
                : cashEvidenceCurrency
                  ? formatCurrencyValue(sourceCashAmount, cashEvidenceCurrency)
                  : "Currency not confirmed"}
            </strong>
          </div>
          <div>
            <span>Trade Lines Ready</span>
            <strong>{validTradeCount()}</strong>
          </div>
          <div>
            <span>As-of Date</span>
            <strong>{asOfDate || "Not selected"}</strong>
          </div>
          <div>
            <span>Indicative Cash After Draft</span>
            <strong>
              {draftImpactModel.status === "available"
                ? formatCurrencyValue(
                    draftImpactModel.preview.proposedCash,
                    draftImpactModel.currencyAuthority.currency
                  )
                : draftImpactModel.blockedBy === "additional_cash"
                  ? "Additional cash needs correction"
                  : "Currency alignment required"}
            </strong>
          </div>
        </div>

        <div className={styles.workspaceGrid}>
          <aside className={styles.actionRail} aria-label="Proposal workflow actions">
            <section
              className={styles.actionPanel}
              data-scenario-cash-state={
                scenarioCashAdmission.status === "ready"
                  ? scenarioCashAdmission.inputState
                  : scenarioCashAdmission.reason
              }
              data-workflow-admission={canRunProposalWorkflow ? "ready" : "blocked"}
            >
              <div>
                <h3>Advisor Workflow</h3>
                <p>
                  Simulate first to review portfolio impact, then save a draft for risk and compliance routing.
                </p>
              </div>
              <ul>
                <li>Portfolio context captured</li>
                <li>Cash movement model ready</li>
                <li>{validTradeCount()} security order lines ready</li>
                {cappedTradeCount ? (
                  <li>{cappedTradeCount} sell line capped to source-backed available units</li>
                ) : null}
                {evaluatedWorkspaceId ? (
                  <li>Workspace {evaluatedWorkspaceId} evaluated by Advise</li>
                ) : null}
              </ul>
              <Stack spacing={1} className={styles.actionButtons}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={
                    !isHydrated || loading || !canRunProposalWorkflow
                  }
                  aria-describedby="proposal-evidence-action-reason"
                  fullWidth
                >
                  {evaluateActionLabel}
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onSaveDraft}
                  disabled={
                    !isHydrated || savingDraft || !canRunProposalWorkflow
                  }
                  aria-describedby="proposal-evidence-action-reason"
                  fullWidth
                >
                  {saveActionLabel}
                </Button>
                <Button component={Link} href="/proposals" variant="text" fullWidth>
                  View Proposal Queue
                </Button>
                <p id="proposal-evidence-action-reason" className={styles.actionReason}>
                  {workflowActionReason}
                </p>
              </Stack>
            </section>
          </aside>

          <div className={styles.mainLane}>
            <ProposalPortfolioEvidencePanel
              evidence={portfolioEvidence}
              cashCurrency={cashEvidenceCurrency}
              sourceCurrency={sourceBookCurrency}
              onRefresh={refreshPortfolioEvidence}
            />

            <section className={styles.panel} aria-labelledby="portfolio-context-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="portfolio-context-heading">Portfolio Context</h3>
                  <p>Confirm the account, currency, and available liquidity before building the draft.</p>
                </div>
              </div>
              <div className={styles.inputGrid}>
                <Controller
                  control={form.control}
                  name="portfolioId"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Portfolio ID"
                      size="small"
                      fullWidth
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Private banking portfolio under review"}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="baseCurrency"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Portfolio Currency"
                      size="small"
                      fullWidth
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Must match the source portfolio book"}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="asOfDate"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Advisory As-of Date"
                      size="small"
                      type="date"
                      fullWidth
                      {...field}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? "Portfolio snapshot used for this proposal"}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="mandateId"
                  render={({ field }) => (
                    <TextField
                      label="Mandate ID"
                      size="small"
                      fullWidth
                      {...field}
                      helperText="Optional advisory mandate context"
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="cashAmount"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Additional Cash Assumption"
                      size="small"
                      fullWidth
                      type="text"
                      name={field.name}
                      value={field.value}
                      onChange={(event) => {
                        const nextInput = event.target.value;
                        field.onChange(nextInput);
                        if (fieldState.isTouched || fieldState.error) {
                          const nextAdmission = assessProposalScenarioCashInput(nextInput);
                          if (nextAdmission.status === "invalid") {
                            form.setError("cashAmount", {
                              type: "validate",
                              message: nextAdmission.message,
                            });
                          } else {
                            form.clearErrors("cashAmount");
                          }
                        }
                      }}
                      onBlur={field.onBlur}
                      inputRef={field.ref}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message ?? PROPOSAL_SCENARIO_CASH_HELP}
                      slotProps={{
                        htmlInput: {
                          inputMode: "decimal",
                          spellCheck: false,
                        },
                      }}
                    />
                  )}
                />
              </div>
            </section>

            <CurrentPositionsPanel
              positions={tradablePositions}
              evidenceStatus={portfolioEvidence.positions.status}
              baseCurrency={sourceBookCurrency}
              onAddPositionTrade={addPositionTrade}
            />

            <CashMovementsPanel
              cashFlows={cashFlows}
              netCashImpact={netCashImpact()}
              onUpdateCashFlow={updateCashFlow}
              onRemoveCashFlow={(id) =>
                setCashFlows((current) => current.filter((row) => row.id !== id))
              }
              onAddCashFlow={() => addCashFlow(form.getValues().baseCurrency || "USD")}
            />

            <DraftOrderBlotterPanel
              trades={trades}
              readyTradeCount={validTradeCount()}
              onUpdateTrade={updateTrade}
              onRemoveTrade={(id) => setTrades((current) => current.filter((row) => row.id !== id))}
              onAddTrade={addTrade}
            />

            <IndicativeDraftImpactPanel
              impactModel={draftImpactModel}
            />

            <section className={styles.panel} aria-labelledby="draft-details-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="draft-details-heading">Draft Details</h3>
                  <p>Name the advisor-use draft before saving it into the proposal workflow.</p>
                </div>
              </div>
              <Controller
                control={form.control}
                name="proposalTitle"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Advisory Draft Title"
                    size="small"
                    fullWidth
                    {...field}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? "Visible in the proposal queue"}
                  />
                )}
              />
            </section>
          </div>

        </div>
      </form>

      {error ? (
        <Alert severity="error" className={styles.message}>
          {error}
        </Alert>
      ) : null}

      {result ? (
        <AdviseEvaluationSummaryPanel
          result={result}
          highlights={simulationHighlights(result)}
          reviewIssueCount={extractEvaluationSummary(workspaceEnvelope)?.review_issue_count}
          blockingIssueCount={extractEvaluationSummary(workspaceEnvelope)?.blocking_issue_count}
          draftTradeCount={
            recordValue(extractEvaluationSummary(workspaceEnvelope)?.impact_summary)?.trade_count
          }
        />
      ) : null}

      {savedDraft ? <SavedAdvisoryDraftPanel proposalId={savedDraft.proposalId} /> : null}
    </SectionBlock>
  );
}
