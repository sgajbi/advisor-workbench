"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import {
  getPortfolioReviewBatchStatus,
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewBatch,
  submitPortfolioReviewOrder,
} from "./api";
import type {
  ReportBatchHandle,
  ReportBatchStatus,
  ReportJobHandle,
  ReportJobListResponse,
  ReportOrderingResponse,
} from "./contracts";
import {
  buildReportOrderingScreenState,
  type ReportOrderingCatalogueState,
  type ReportOrderingSubmissionState,
} from "./report-ordering-screen-state";
import {
  applyReportScopeReadiness,
  buildReportOrderingViewModel,
  configurationFingerprint,
  createReportOrderingConfiguration,
  selectReportOrderingFamily,
  toReportRequestRows,
  type ReportOrderingConfiguration,
  type ReportOrderingScopeMode,
} from "./view-model";

type ReviewedIntent = {
  portfolioId: string;
  scopeFingerprint: string;
  configurationFingerprint: string;
  sourceFingerprint: string;
  idempotencyKey: string;
};

type SubmissionProgressState = {
  portfolioId: string;
  state: ReportOrderingSubmissionState;
  error: string | null;
};

type ActiveBatchIntent = {
  portfolioIds: string[];
  asOfDate: string;
  requestedOutputFormats: string[];
  reportingCurrency: string | null;
};

type HistoryLoadState = "loading" | "ready" | "permission_blocked" | "error";

export function useReportOrderingWorkflow({
  portfolioId,
  asOfDate,
  reportingCurrency,
  scopeMode = "single_portfolio",
  selectedPortfolioIds = [portfolioId],
  portfolioSelectionState = "ready",
}: {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
  scopeMode?: ReportOrderingScopeMode;
  selectedPortfolioIds?: string[];
  portfolioSelectionState?: "loading" | "ready" | "error";
}) {
  const [catalogue, setCatalogue] = useState<ReportOrderingResponse | null>(null);
  const [catalogueState, setCatalogueState] =
    useState<ReportOrderingCatalogueState>("loading");
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [configuration, setConfiguration] =
    useState<ReportOrderingConfiguration | null>(null);
  const [history, setHistory] = useState<ReportJobListResponse | null>(null);
  const [historyState, setHistoryState] = useState<HistoryLoadState>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [reviewedIntent, setReviewedIntent] = useState<ReviewedIntent | null>(null);
  const [submissionProgress, setSubmissionProgress] =
    useState<SubmissionProgressState>({
      portfolioId,
      state: "idle",
      error: null,
    });
  const [submittedHandlesByPortfolio, setSubmittedHandlesByPortfolio] = useState<
    Record<string, ReportJobHandle>
  >({});
  const [submittedBatchHandle, setSubmittedBatchHandle] = useState<ReportBatchHandle | null>(null);
  const [batchStatus, setBatchStatus] = useState<ReportBatchStatus | null>(null);
  const [batchStatusError, setBatchStatusError] = useState<string | null>(null);
  const sourceFingerprintRef = useRef<string>("");
  const activePortfolioIdRef = useRef(portfolioId);
  const activeBatchIdRef = useRef<string | null>(null);
  const activeBatchIntentRef = useRef<ActiveBatchIntent | null>(null);
  const batchStatusRequestSequenceRef = useRef(0);
  const historyRequestSequenceRef = useRef(0);

  const loadBatchStatus = useCallback(async (batchId: string) => {
    const requestSequence = ++batchStatusRequestSequenceRef.current;
    setBatchStatusError(null);
    try {
      const response = await getPortfolioReviewBatchStatus(batchId);
      if (
        activeBatchIdRef.current !== batchId ||
        batchStatusRequestSequenceRef.current !== requestSequence
      ) {
        return false;
      }
      if (response.batch_id !== batchId) {
        setBatchStatusError(
          "The bundle was accepted, but the returned portfolio outcomes did not match this request.",
        );
        return false;
      }
      const activeBatchIntent = activeBatchIntentRef.current;
      const returnedPortfolioIds = [...response.materialized_portfolio_ids].sort();
      if (
        !activeBatchIntent ||
        activeBatchIntent.portfolioIds.length !== returnedPortfolioIds.length ||
        activeBatchIntent.portfolioIds.some(
          (portfolioId, index) => portfolioId !== returnedPortfolioIds[index],
        )
      ) {
        setBatchStatusError(
          "The bundle was accepted, but the returned portfolios did not match the reviewed selection.",
        );
        return false;
      }
      const returnedOutputFormats = [...response.requested_output_formats].sort();
      if (
        response.as_of_date !== activeBatchIntent.asOfDate ||
        activeBatchIntent.requestedOutputFormats.length !== returnedOutputFormats.length ||
        activeBatchIntent.requestedOutputFormats.some(
          (outputFormat, index) => outputFormat !== returnedOutputFormats[index],
        ) ||
        response.reporting_currency !== activeBatchIntent.reportingCurrency
      ) {
        setBatchStatusError(
          "The bundle was accepted, but the returned report setup did not match the reviewed request.",
        );
        return false;
      }
      setBatchStatus(response);
      return true;
    } catch {
      if (
        activeBatchIdRef.current !== batchId ||
        batchStatusRequestSequenceRef.current !== requestSequence
      ) {
        return false;
      }
      setBatchStatusError("The bundle was accepted, but current portfolio outcomes could not be loaded.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (
      !submittedBatchHandle ||
      (batchStatus && isTerminalBatchStatus(batchStatus.status)) ||
      (!batchStatus && !batchStatusError)
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      void loadBatchStatus(submittedBatchHandle.batch_id);
    }, batchStatusError ? 10_000 : 5_000);
    return () => window.clearTimeout(timer);
  }, [batchStatus, batchStatusError, loadBatchStatus, submittedBatchHandle]);

  const loadHistory = useCallback(async () => {
    const requestSequence = ++historyRequestSequenceRef.current;
    setHistoryState("loading");
    setHistoryError(null);
    try {
      const response = await listPortfolioReviewOrders(portfolioId);
      if (
        activePortfolioIdRef.current !== portfolioId ||
        historyRequestSequenceRef.current !== requestSequence
      ) {
        return;
      }
      setHistory(response);
      setHistoryState("ready");
    } catch (error) {
      if (
        activePortfolioIdRef.current !== portfolioId ||
        historyRequestSequenceRef.current !== requestSequence
      ) {
        return;
      }
      setHistory(null);
      setHistoryState(isWorkbenchPermissionBlockedError(error) ? "permission_blocked" : "error");
      setHistoryError(historyErrorCopy(error));
    }
  }, [portfolioId]);

  const loadCatalogue = useCallback(
    async (resetConfiguration: boolean) => {
      setCatalogueState("loading");
      setCatalogueError(null);
      try {
        const response = await getReportOrderingOptions(portfolioId);
        if (activePortfolioIdRef.current !== portfolioId) {
          return;
        }
        const nextSourceFingerprint = JSON.stringify(response);
        if (
          sourceFingerprintRef.current &&
          sourceFingerprintRef.current !== nextSourceFingerprint
        ) {
          setReviewedIntent(null);
        }
        sourceFingerprintRef.current = nextSourceFingerprint;
        setCatalogue(response);
        setConfiguration((current) =>
          resetConfiguration || !current
            ? createReportOrderingConfiguration(response, { asOfDate, reportingCurrency })
            : current,
        );
        setCatalogueState("ready");
      } catch (error) {
        if (activePortfolioIdRef.current !== portfolioId) {
          return;
        }
        setCatalogue(null);
        setConfiguration(null);
        setReviewedIntent(null);
        setCatalogueState(
          isWorkbenchPermissionBlockedError(error) ? "permission_blocked" : "error",
        );
        setCatalogueError(catalogueErrorCopy(error));
      }
    },
    [asOfDate, portfolioId, reportingCurrency],
  );

  useEffect(() => {
    activePortfolioIdRef.current = portfolioId;
    activeBatchIdRef.current = null;
    activeBatchIntentRef.current = null;
    batchStatusRequestSequenceRef.current += 1;
    sourceFingerprintRef.current = "";
    setSubmittedBatchHandle(null);
    setBatchStatus(null);
    setBatchStatusError(null);
    setSubmissionProgress({ portfolioId, state: "idle", error: null });
    const timer = window.setTimeout(() => {
      void loadCatalogue(true);
      void loadHistory();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadCatalogue, loadHistory, portfolioId]);

  const baseModel = useMemo(
    () =>
      catalogue && configuration
        ? buildReportOrderingViewModel(catalogue, configuration)
        : null,
    [catalogue, configuration],
  );
  const model = useMemo(
    () => baseModel
      ? applyReportScopeReadiness(
          baseModel,
          scopeMode,
          selectedPortfolioIds,
          portfolioSelectionState,
        )
      : null,
    [baseModel, portfolioSelectionState, scopeMode, selectedPortfolioIds],
  );
  const publishedConfigurationFieldIds = useMemo(
    () =>
      new Set(model?.family?.configurationFields.map((field) => field.fieldId) ?? []),
    [model?.family?.configurationFields],
  );
  const currentConfigurationFingerprint = configuration
    ? configurationFingerprint(configuration)
    : "";
  const currentSourceFingerprint = catalogue ? JSON.stringify(catalogue) : "";
  const currentScopeFingerprint = JSON.stringify({
    scopeMode,
    portfolioIds: [...selectedPortfolioIds].sort(),
  });
  const activeReviewedIntent =
    reviewedIntent?.portfolioId === portfolioId ? reviewedIntent : null;
  const preflightReviewed = Boolean(
    activeReviewedIntent &&
      activeReviewedIntent.configurationFingerprint === currentConfigurationFingerprint &&
      activeReviewedIntent.sourceFingerprint === currentSourceFingerprint &&
      activeReviewedIntent.scopeFingerprint === currentScopeFingerprint,
  );
  const submittedHandle = submittedHandlesByPortfolio[portfolioId] ?? null;
  const activeSubmissionProgress =
    submissionProgress.portfolioId === portfolioId
      ? submissionProgress
      : { portfolioId, state: "idle" as const, error: null };
  const acceptedHandle = scopeMode === "explicit_portfolio_batch" ? submittedBatchHandle : submittedHandle;
  const submissionState = acceptedHandle ? "accepted" : activeSubmissionProgress.state;
  const submissionError = acceptedHandle ? null : activeSubmissionProgress.error;
  const screenState = useMemo(
    () =>
      buildReportOrderingScreenState({
        catalogueState,
        catalogueError,
        model,
        preflightReviewed,
        submissionState,
        submissionError,
      }),
    [
      catalogueError,
      catalogueState,
      model,
      preflightReviewed,
      submissionError,
      submissionState,
    ],
  );

  const updateConfiguration = useCallback(
    (patch: Partial<ReportOrderingConfiguration>) => {
      if (activeSubmissionProgress.state === "submitting") {
        return;
      }
      setConfiguration((current) => {
        if (!current) {
          return current;
        }
        if (catalogue && patch.familyId && patch.familyId !== current.familyId) {
          return selectReportOrderingFamily(catalogue, current, patch.familyId);
        }
        return { ...current, ...patch };
      });
      setReviewedIntent(null);
      setSubmissionProgress((current) =>
        current.portfolioId === portfolioId && current.state === "submitting"
          ? current
          : { portfolioId, state: "idle", error: null },
      );
    },
    [activeSubmissionProgress.state, catalogue, portfolioId],
  );

  const toggleSection = useCallback(
    (sectionId: string) => {
      const choice = model?.sectionChoices.find((section) => section.id === sectionId);
      if (!choice || (choice.required && choice.selected)) {
        return;
      }
      const selectedSections = choice.selected
        ? configuration?.selectedSections.filter((id) => id !== sectionId) ?? []
        : [...(configuration?.selectedSections ?? []), sectionId];
      updateConfiguration({ selectedSections });
    },
    [configuration?.selectedSections, model?.sectionChoices, updateConfiguration],
  );

  const reviewRequest = useCallback(() => {
    if (!model?.canSubmit || !configuration) {
      return false;
    }
    setReviewedIntent((current) => {
      const fingerprint = configurationFingerprint(configuration);
      if (
        current?.portfolioId === portfolioId &&
        current.scopeFingerprint === currentScopeFingerprint &&
        current?.configurationFingerprint === fingerprint &&
        current.sourceFingerprint === sourceFingerprintRef.current
      ) {
        return current;
      }
      return {
        portfolioId,
        scopeFingerprint: currentScopeFingerprint,
        configurationFingerprint: fingerprint,
        sourceFingerprint: sourceFingerprintRef.current,
        idempotencyKey: createReportOrderIntentKey(),
      };
    });
    setSubmissionProgress((current) =>
      current.portfolioId === portfolioId
        ? { ...current, error: null }
        : { portfolioId, state: "idle", error: null },
    );
    return true;
  }, [configuration, currentScopeFingerprint, model?.canSubmit, portfolioId]);

  const submitRequest = useCallback(async () => {
    if (
      !configuration ||
      !model?.canSubmit ||
      !activeReviewedIntent ||
      activeReviewedIntent.configurationFingerprint !== configurationFingerprint(configuration) ||
      activeReviewedIntent.sourceFingerprint !== sourceFingerprintRef.current ||
      activeReviewedIntent.scopeFingerprint !== currentScopeFingerprint
    ) {
      return false;
    }

    setSubmissionProgress({ portfolioId, state: "submitting", error: null });
    try {
      const sharedOrder = {
        asOfDate: configuration.asOfDate,
        outputFormat: configuration.outputFormat,
        ...(publishedConfigurationFieldIds.has("reporting_currency") &&
        configuration.reportingCurrency
          ? { reportingCurrency: configuration.reportingCurrency }
          : {}),
        ...(publishedConfigurationFieldIds.has("benchmark_code") &&
        configuration.benchmarkCode
          ? { benchmarkCode: configuration.benchmarkCode }
          : {}),
        ...(publishedConfigurationFieldIds.has("allocation_dimensions") &&
        configuration.allocationDimensions.length
          ? { allocationDimensions: configuration.allocationDimensions }
          : {}),
        sections: configuration.selectedSections,
        idempotencyKey: activeReviewedIntent.idempotencyKey,
      };
      const handle = scopeMode === "explicit_portfolio_batch"
        ? await submitPortfolioReviewBatch({
            ...sharedOrder,
            portfolioIds: [...selectedPortfolioIds].sort(),
          })
        : await submitPortfolioReviewOrder({ ...sharedOrder, portfolioId });
      if (activePortfolioIdRef.current !== portfolioId) {
        return false;
      }
      if (scopeMode === "explicit_portfolio_batch") {
        const batchHandle = handle as ReportBatchHandle;
        if (
          batchHandle.idempotency_key !== activeReviewedIntent.idempotencyKey ||
          batchHandle.item_count !== selectedPortfolioIds.length
        ) {
          throw new Error("The accepted bundle did not match the reviewed request intent.");
        }
        activeBatchIntentRef.current = {
          portfolioIds: [...selectedPortfolioIds].sort(),
          asOfDate: configuration.asOfDate,
          requestedOutputFormats: [configuration.outputFormat],
          reportingCurrency:
            publishedConfigurationFieldIds.has("reporting_currency") &&
            configuration.reportingCurrency
              ? configuration.reportingCurrency
              : null,
        };
        activeBatchIdRef.current = batchHandle.batch_id;
        setSubmittedBatchHandle(batchHandle);
        await loadBatchStatus(batchHandle.batch_id);
        if (activeBatchIdRef.current !== batchHandle.batch_id) {
          return false;
        }
      } else {
        setSubmittedHandlesByPortfolio((current) => ({
          ...current,
          [portfolioId]: handle as ReportJobHandle,
        }));
      }
      setSubmissionProgress({ portfolioId, state: "accepted", error: null });
      if (scopeMode === "single_portfolio") await loadHistory();
      return true;
    } catch (error) {
      if (activePortfolioIdRef.current !== portfolioId) {
        return false;
      }
      setSubmissionProgress({
        portfolioId,
        state: "error",
        error: submissionErrorCopy(error),
      });
      return false;
    }
  }, [
    configuration,
    loadHistory,
    loadBatchStatus,
    model?.canSubmit,
    portfolioId,
    publishedConfigurationFieldIds,
    activeReviewedIntent,
    currentScopeFingerprint,
    scopeMode,
    selectedPortfolioIds,
  ]);

  const startAnotherReport = useCallback(() => {
    if (!acceptedHandle) {
      return false;
    }

    setSubmittedHandlesByPortfolio((current) => {
      const next = { ...current };
      delete next[portfolioId];
      return next;
    });
    setReviewedIntent(null);
    activeBatchIdRef.current = null;
    activeBatchIntentRef.current = null;
    batchStatusRequestSequenceRef.current += 1;
    setSubmittedBatchHandle(null);
    setBatchStatus(null);
    setBatchStatusError(null);
    setSubmissionProgress({ portfolioId, state: "idle", error: null });
    return true;
  }, [acceptedHandle, portfolioId]);

  return {
    catalogue,
    catalogueState,
    catalogueError,
    configuration,
    model,
    history,
    historyRows: toReportRequestRows(history?.items ?? []),
    historyState,
    historyError,
    submissionState,
    submissionError,
    submittedHandle,
    submittedBatchHandle,
    batchStatus,
    batchStatusError,
    supportReference: submittedBatchHandle?.batch_id ?? submittedHandle?.report_job_id ?? null,
    screenState,
    preflightReviewed,
    canSubmitReviewedRequest:
      Boolean(model?.canSubmit && preflightReviewed) &&
      submissionState !== "submitting" &&
      submissionState !== "accepted",
    updateConfiguration,
    toggleSection,
    reviewRequest,
    submitRequest,
    startAnotherReport,
    refreshCatalogue: () => loadCatalogue(false),
    refreshHistory: loadHistory,
    refreshBatchStatus: () => submittedBatchHandle
      ? loadBatchStatus(submittedBatchHandle.batch_id)
      : Promise.resolve(false),
  };
}

export function createReportOrderIntentKey(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `workbench-report-order-${randomPart}`;
}

function catalogueErrorCopy(error: unknown): string {
  return isWorkbenchPermissionBlockedError(error)
    ? "This portfolio is not available for report ordering with the current business role."
    : "Approved report choices are temporarily unavailable. Try again or contact Reporting Operations.";
}

function historyErrorCopy(error: unknown): string {
  return isWorkbenchPermissionBlockedError(error)
    ? "Recent report requests are not available for this portfolio."
    : "Recent report requests could not be loaded. New ordering availability is shown separately.";
}

function submissionErrorCopy(error: unknown): string {
  return isWorkbenchPermissionBlockedError(error)
    ? "This report request is no longer permitted for the selected portfolio."
    : "The report request was not accepted. Your reviewed setup is preserved for a safe retry.";
}

function isTerminalBatchStatus(status: ReportBatchStatus["status"]): boolean {
  return status === "completed" ||
    status === "completed_with_failures" ||
    status === "failed" ||
    status === "cancelled";
}
