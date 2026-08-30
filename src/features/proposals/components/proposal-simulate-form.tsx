"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@mui/material";

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
  proposalCashFlowToMinorUnits,
  type ProposalDraftCashFlowIntent,
  type ProposalDraftTradeIntent,
} from "../proposal-draft-preview";
import { formatProposalMinorUnits } from "../proposal-money";
import { buildProposalDraftImpactModel } from "../proposal-draft-currency-authority";
import { buildProposalDraftFingerprint } from "../proposal-draft-evaluation";
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
import { MainWithSideRailLayout, SectionBlock } from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";
import { isBusinessDateValue } from "@/design-system/utils/financial-formatters";
import {
  AdviseEvaluationSummaryPanel,
  CashMovementsPanel,
  CurrentPositionsPanel,
  DraftOrderBlotterPanel,
  IndicativeDraftImpactPanel,
  ProposalPortfolioEvidencePanel,
  SavedAdvisoryDraftPanel,
} from "./proposal-builder-domain-panels";
import ProposalBuilderWorkflowRail from "./proposal-builder-workflow-rail";
import { usePublishProposalWorkflowContext } from "./proposal-workflow-context";
import {
  ProposalActionBusinessError,
  proposalActionFailureCopy,
  proposalActionFailureSupportEvidence,
  type ProposalActionSupportEvidence,
} from "../proposal-action-error";
import styles from "./proposal-simulate-form.module.css";

const schema = z.object({
  idempotencyKey: z.string().min(6, "Draft control key is required"),
  createdBy: z.string().min(1, "Advisor identity is required"),
  proposalTitle: z.string().min(1, "Advisory draft title is required"),
  portfolioId: z.string().trim().min(1, "Portfolio ID is required"),
  asOfDate: z
    .string()
    .trim()
    .refine(
      isBusinessDateValue,
      "Use a valid advisory date in YYYY-MM-DD format",
    ),
  mandateId: z.string().optional(),
  baseCurrency: z.string().trim().length(3, "Use a three-letter currency code"),
  cashAmount: proposalScenarioCashInputSchema,
});

type FormInput = z.infer<typeof schema>;

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
  const minorUnits = proposalCashFlowToMinorUnits(item);
  if (minorUnits === null) {
    throw new ProposalActionBusinessError(
      "Cash movement amount must use no more than 2 decimal places and remain within the reliable draft range."
    );
  }
  return formatProposalMinorUnits(item.direction === "OUT" ? -minorUnits : minorUnits);
}

export default function ProposalSimulateForm({
  initialPortfolioId,
  initialAsOfDate = "",
  initialReportingCurrency = "",
  sourceContextConfirmed,
}: {
  initialPortfolioId: string;
  initialAsOfDate?: string;
  initialReportingCurrency?: string;
  sourceContextConfirmed: boolean;
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
      asOfDate: initialAsOfDate,
      mandateId: "",
      baseCurrency: initialReportingCurrency,
      cashAmount: "10000",
    },
  });

  const [cashFlows, setCashFlows] = useState<ProposalDraftCashFlowIntent[]>([
    createCashFlowIntent(1, initialReportingCurrency),
  ]);
  const [trades, setTrades] = useState<ProposalDraftTradeIntent[]>([
    createTradeIntent(1, initialReportingCurrency),
  ]);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSupportEvidence, setErrorSupportEvidence] =
    useState<ProposalActionSupportEvidence | null>(null);
  const [result, setResult] = useState<ProposalSimulateResponse | null>(null);
  const [workspaceEnvelope, setWorkspaceEnvelope] =
    useState<AdvisoryWorkspaceEnvelopeResponse | null>(null);
  const [evaluatedWorkspaceId, setEvaluatedWorkspaceId] = useState<string | null>(null);
  const [evaluatedDraftFingerprint, setEvaluatedDraftFingerprint] = useState<string | null>(null);
  const [evaluatedPortfolioEvidenceUpdatedAt, setEvaluatedPortfolioEvidenceUpdatedAt] =
    useState<number | null>(null);
  const [savedDraft, setSavedDraft] = useState<{
    proposalId: string;
    portfolioId: string;
  } | null>(null);

  const portfolioId = useWatch({ control: form.control, name: "portfolioId" });
  const asOfDate = useWatch({ control: form.control, name: "asOfDate" });
  const baseCurrency = useWatch({ control: form.control, name: "baseCurrency" });
  const cashAmount = useWatch({ control: form.control, name: "cashAmount" });
  const proposalTitle = useWatch({ control: form.control, name: "proposalTitle" });
  const mandateId = useWatch({ control: form.control, name: "mandateId" });
  const scenarioCashAdmission = useMemo(
    () => assessProposalScenarioCashInput(cashAmount),
    [cashAmount]
  );
  const evidencePortfolioId = portfolioId.trim();
  const evidenceAsOfDate = asOfDate.trim();
  const evidenceCurrency = baseCurrency.trim().toUpperCase();
  const hasPortfolioEvidenceContext = evidencePortfolioId.length > 0;
  const hasValidEvidenceDate = isBusinessDateValue(evidenceAsOfDate);
  const canRequestPortfolioEvidence = !evidenceAsOfDate || hasValidEvidenceDate;
  const hasValidEvidenceCurrency = /^[A-Z]{3}$/.test(evidenceCurrency);
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
        ...(hasValidEvidenceDate ? { asOfDate: evidenceAsOfDate } : {}),
        ...(hasValidEvidenceCurrency
          ? { reportingCurrency: evidenceCurrency }
          : {}),
      }),
    enabled:
      sourceContextConfirmed &&
      hasPortfolioEvidenceContext &&
      canRequestPortfolioEvidence,
    ...workbenchStrictQueryDefaults,
  });
  const sourceBookAsOfDate = portfolioBookQuery.data?.as_of_date?.trim() ?? "";
  const hasValidSourceBookDate = isBusinessDateValue(sourceBookAsOfDate);
  const sourceBookIdentityCurrency =
    portfolioBookQuery.data?.portfolio.base_currency?.trim().toUpperCase() ?? "";
  const sourceBookDefaultCurrency =
    hasValidSourceBookDate && /^[A-Z]{3}$/.test(sourceBookIdentityCurrency)
      ? sourceBookIdentityCurrency
      : "";

  useEffect(() => {
    if (
      !evidenceAsOfDate &&
      hasValidSourceBookDate
    ) {
      form.setValue("asOfDate", sourceBookAsOfDate, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
    if (
      !evidenceCurrency &&
      sourceBookDefaultCurrency
    ) {
      form.setValue("baseCurrency", sourceBookDefaultCurrency, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [
    evidenceAsOfDate,
    evidenceCurrency,
    form,
    hasValidSourceBookDate,
    sourceBookAsOfDate,
    sourceBookDefaultCurrency,
  ]);
  const resolvedCashFlows = useMemo(
    () =>
      cashFlows.map((item) =>
        item.currency.trim() || !sourceBookDefaultCurrency
          ? item
          : { ...item, currency: sourceBookDefaultCurrency },
      ),
    [cashFlows, sourceBookDefaultCurrency],
  );
  const resolvedTrades = useMemo(
    () =>
      trades.map((item) =>
        item.referencePriceCurrency?.trim() || !sourceBookDefaultCurrency
          ? item
          : {
              ...item,
              referencePriceCurrency: sourceBookDefaultCurrency,
            },
      ),
    [sourceBookDefaultCurrency, trades],
  );
  const draftFingerprint = useMemo(
    () =>
      buildProposalDraftFingerprint({
        values: {
          proposalTitle,
          portfolioId,
          asOfDate,
          mandateId,
          baseCurrency,
          cashAmount,
        },
        cashFlows: resolvedCashFlows,
        trades: resolvedTrades,
      }),
    [
      asOfDate,
      baseCurrency,
      cashAmount,
      mandateId,
      portfolioId,
      proposalTitle,
      resolvedCashFlows,
      resolvedTrades,
    ],
  );
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
  const isEvaluationCurrent =
    Boolean(result) &&
    portfolioEvidence.status === "ready" &&
    evaluatedDraftFingerprint === draftFingerprint &&
    evaluatedPortfolioEvidenceUpdatedAt !== null &&
    !portfolioBookQuery.isFetching &&
    evaluatedPortfolioEvidenceUpdatedAt === portfolioBookQuery.dataUpdatedAt;
  const tradablePositions = portfolioEvidence.positions.items;
  const sourceCashAmount = portfolioEvidence.cash.amount;
  const currentCashAmount =
    portfolioEvidence.cash.authority === "portfolio_book" ? (sourceCashAmount ?? 0) : 0;
  const draftImpactModel = useMemo(
    () =>
      buildProposalDraftImpactModel({
        positions: tradablePositions,
        cashAmount: currentCashAmount,
        cashFlows: resolvedCashFlows,
        trades: resolvedTrades,
        requestedCurrency: evidenceCurrency,
        portfolioEvidence,
        additionalCashAdmission: scenarioCashAdmission,
      }),
    [
      resolvedCashFlows,
      currentCashAmount,
      evidenceCurrency,
      portfolioEvidence,
      scenarioCashAdmission,
      tradablePositions,
      resolvedTrades,
    ]
  );
  const sourceBookCurrency = draftImpactModel.currencyAuthority.sourceCurrency;
  const cashEvidenceCurrency =
    portfolioEvidence.cash.authority === "portfolio_book"
      ? sourceBookCurrency
      : draftImpactModel.currencyAuthority.requestedCurrency;
  const executableTradeRows = useMemo(
    () => buildExecutableTradeRows(tradablePositions, resolvedTrades),
    [resolvedTrades, tradablePositions]
  );
  const cappedTradeCount = executableTradeRows.filter(
    (item) => item.cappedToAvailableQuantity
  ).length;
  const cashMovementsPrecisionReady = resolvedCashFlows.every(
    (item) => proposalCashFlowToMinorUnits(item) !== null
  );
  const canRunProposalWorkflow =
    sourceContextConfirmed &&
    portfolioEvidence.canEvaluateAndHandoff &&
    scenarioCashAdmission.status === "ready" &&
    cashMovementsPrecisionReady &&
    !(draftImpactModel.status === "unavailable" && draftImpactModel.blockedBy === "monetary_precision");
  const workflowActionReason = !sourceContextConfirmed
    ? "Proposal actions remain unavailable until the review context confirms the selected portfolio."
    : !portfolioEvidence.canEvaluateAndHandoff
    ? "Evaluation and draft handoff remain unavailable until the selected portfolio context is confirmed."
    : scenarioCashAdmission.status === "invalid"
      ? "Correct the additional cash assumption before evaluating or saving this draft."
      : !cashMovementsPrecisionReady
        ? "Correct cash movement precision before evaluating or saving this draft."
      : draftImpactModel.status === "unavailable" && draftImpactModel.blockedBy === "monetary_precision"
        ? "Reduce the additional cash assumption or draft amounts before evaluating or saving this draft."
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
    setEvaluatedDraftFingerprint(null);
    setEvaluatedPortfolioEvidenceUpdatedAt(null);
    await portfolioBookQuery.refetch({ cancelRefetch: true });
  }

  function confirmPortfolioEvidence(): boolean {
    if (sourceContextConfirmed && portfolioEvidence.canEvaluateAndHandoff) {
      return true;
    }
    setError(
      "Confirm current portfolio holdings and cash before evaluating or saving this advisor draft."
    );
    setErrorSupportEvidence(null);
    return false;
  }

  function netCashImpact(): string {
    let totalMinorUnits = 0n;
    for (const item of resolvedCashFlows) {
      const minorUnits = proposalCashFlowToMinorUnits(item);
      if (minorUnits === null) {
        return "Needs correction";
      }
      totalMinorUnits += item.direction === "OUT" ? -minorUnits : minorUnits;
    }
    return formatProposalMinorUnits(totalMinorUnits);
  }

  function validTradeCount(): number {
    return executableTradeRows.length;
  }

  function validCashFlowRows(): ProposalDraftCashFlowIntent[] {
    return resolvedCashFlows.filter((item) => {
      const minorUnits = proposalCashFlowToMinorUnits(item);
      return item.currency.trim().length > 0 && minorUnits !== null && minorUnits > 0n;
    });
  }

  function validTradeRows() {
    return executableTradeRows;
  }

  function syncEvaluationFromWorkspace(envelope: AdvisoryWorkspaceEnvelopeResponse) {
    const evaluationResult = buildAdvisoryWorkspaceEvaluationResult(envelope);
    if (!evaluationResult) {
      throw new ProposalActionBusinessError(
        "Proposal evaluation returned incomplete evidence. Review the draft and try again."
      );
    }

    setWorkspaceEnvelope(envelope);
    setResult(evaluationResult);
  }

  async function createEvaluatedWorkspace(values: FormInput): Promise<AdvisoryWorkspaceEnvelopeResponse> {
    setEvaluatedWorkspaceId(null);
    setEvaluatedDraftFingerprint(null);
    setEvaluatedPortfolioEvidenceUpdatedAt(null);
    setWorkspaceEnvelope(null);
    setResult(null);
    const mandateId = values.mandateId?.trim();
    const preparedCashFlows = validCashFlowRows().map((item) => ({
      ...item,
      signedAmount: signedCashAmount(item),
    }));
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
      throw new ProposalActionBusinessError(
        "Advisory workspace was created without a workspace identifier."
      );
    }

    let latestResponse = workspaceResponse;

    for (const item of preparedCashFlows) {
      latestResponse = await applyAdvisoryWorkspaceDraftAction(workspaceId, {
        body: {
          actor_id: values.createdBy,
          action_type: "ADD_CASH_FLOW",
          cash_flow: {
            intent_type: "CASH_FLOW",
            currency: item.currency.toUpperCase(),
            amount: item.signedAmount,
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
    setErrorSupportEvidence(null);
    setSavedDraft(null);
    if (!confirmPortfolioEvidence()) {
      return;
    }
    setLoading(true);
    const portfolioEvidenceUpdatedAt = portfolioBookQuery.dataUpdatedAt;
    try {
      await createEvaluatedWorkspace(values);
      setEvaluatedDraftFingerprint(
        buildProposalDraftFingerprint({
          values,
          cashFlows: resolvedCashFlows,
          trades: resolvedTrades,
        })
      );
      setEvaluatedPortfolioEvidenceUpdatedAt(portfolioEvidenceUpdatedAt);
    } catch (err) {
      setError(proposalActionFailureCopy(err, "evaluate_draft"));
      setErrorSupportEvidence(proposalActionFailureSupportEvidence(err));
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
    const portfolioEvidenceUpdatedAt = portfolioBookQuery.dataUpdatedAt;
    setError(null);
    setErrorSupportEvidence(null);
    setSavingDraft(true);
    try {
      const evaluatedWorkspace = await createEvaluatedWorkspace(values);
      setEvaluatedDraftFingerprint(
        buildProposalDraftFingerprint({
          values,
          cashFlows: resolvedCashFlows,
          trades: resolvedTrades,
        })
      );
      setEvaluatedPortfolioEvidenceUpdatedAt(portfolioEvidenceUpdatedAt);
      const workspaceId = extractAdvisoryWorkspaceId(evaluatedWorkspace);
      if (!workspaceId) {
        throw new ProposalActionBusinessError(
          "Advisory workspace cannot be handed off without a workspace identifier."
        );
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
        throw new ProposalActionBusinessError(
          "The advisory service retained no proposal identity for this draft."
        );
      }
      setSavedDraft({ proposalId, portfolioId: values.portfolioId });
    } catch (err) {
      setError(proposalActionFailureCopy(err, "save_draft"));
      setErrorSupportEvidence(proposalActionFailureSupportEvidence(err));
    } finally {
      setSavingDraft(false);
    }
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
            <span>Indicative Cash After Draft</span>
            <strong>
              {draftImpactModel.status === "available"
                ? formatCurrencyValue(
                    draftImpactModel.preview.proposedCash,
                    draftImpactModel.currencyAuthority.currency
                  )
                : draftImpactModel.blockedBy === "additional_cash"
                  ? "Additional cash needs correction"
                  : draftImpactModel.blockedBy === "monetary_precision"
                    ? "Draft amount exceeds reliable range"
                  : "Currency alignment required"}
            </strong>
          </div>
        </div>

        <MainWithSideRailLayout
          className={styles.workspaceGrid}
          mainClassName={styles.mainLane}
          sideClassName={styles.stickyRail}
          main={
            <>
            <ProposalPortfolioEvidencePanel
              evidence={portfolioEvidence}
              cashCurrency={cashEvidenceCurrency}
              sourceCurrency={sourceBookCurrency}
              onRefresh={refreshPortfolioEvidence}
              refreshBlocked={loading || savingDraft}
            />

            <section className={styles.panel} aria-labelledby="scenario-assumptions-heading">
              <div className={styles.panelHeader}>
                <div>
                  <h3 id="scenario-assumptions-heading">Scenario assumptions</h3>
                  <p>
                    Set only assumptions that change the indicative proposal. Portfolio identity,
                    business date, currency, and mandate are governed by the review context above.
                  </p>
                </div>
              </div>
              <div className={styles.inputGrid}>
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
              cashFlows={resolvedCashFlows}
              netCashImpact={netCashImpact()}
              onUpdateCashFlow={updateCashFlow}
              onRemoveCashFlow={(id) =>
                setCashFlows((current) => current.filter((row) => row.id !== id))
              }
              onAddCashFlow={() => addCashFlow(form.getValues().baseCurrency)}
            />

            <DraftOrderBlotterPanel
              trades={resolvedTrades}
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
            {isEvaluationCurrent && result ? (
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
            </>
          }
          side={
            <ProposalBuilderWorkflowRail
              queuePortfolioId={
                sourceContextConfirmed
                  ? (savedDraft?.portfolioId ?? portfolioId)
                  : null
              }
              canRunWorkflow={canRunProposalWorkflow}
              isPortfolioEvidenceConfirmed={
                sourceContextConfirmed && portfolioEvidence.canEvaluateAndHandoff
              }
              actionReason={workflowActionReason}
              scenarioCashState={
                scenarioCashAdmission.status === "ready"
                  ? scenarioCashAdmission.inputState
                  : scenarioCashAdmission.reason
              }
              readyTradeCount={validTradeCount()}
              cappedTradeCount={cappedTradeCount}
              evaluatedWorkspaceId={isEvaluationCurrent ? evaluatedWorkspaceId : null}
              savedProposalId={savedDraft?.proposalId ?? null}
              evaluationAvailable={isEvaluationCurrent}
              isHydrated={isHydrated}
              isEvaluating={loading}
              isSaving={savingDraft}
              error={error}
              errorSupportEvidence={errorSupportEvidence}
              onSaveDraft={() => void onSaveDraft()}
            />
          }
        />
      </form>
    </SectionBlock>
  );
}
