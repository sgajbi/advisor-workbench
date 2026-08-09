"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";

import {
  getReportOrderingOptions,
  listPortfolioReviewOrders,
  submitPortfolioReviewOrder,
} from "./api";
import type {
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
  buildReportOrderingViewModel,
  configurationFingerprint,
  createReportOrderingConfiguration,
  selectReportOrderingFamily,
  toReportRequestRows,
  type ReportOrderingConfiguration,
} from "./view-model";

type ReviewedIntent = {
  portfolioId: string;
  configurationFingerprint: string;
  sourceFingerprint: string;
  idempotencyKey: string;
};

type SubmissionProgressState = {
  portfolioId: string;
  state: ReportOrderingSubmissionState;
  error: string | null;
};

type HistoryLoadState = "loading" | "ready" | "permission_blocked" | "error";

export function useReportOrderingWorkflow({
  portfolioId,
  asOfDate,
  reportingCurrency,
}: {
  portfolioId: string;
  asOfDate: string;
  reportingCurrency: string;
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
  const sourceFingerprintRef = useRef<string>("");
  const activePortfolioIdRef = useRef(portfolioId);

  const loadHistory = useCallback(async () => {
    setHistoryState("loading");
    setHistoryError(null);
    try {
      const response = await listPortfolioReviewOrders(portfolioId);
      if (activePortfolioIdRef.current !== portfolioId) {
        return;
      }
      setHistory(response);
      setHistoryState("ready");
    } catch (error) {
      if (activePortfolioIdRef.current !== portfolioId) {
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
    sourceFingerprintRef.current = "";
    const timer = window.setTimeout(() => {
      void loadCatalogue(true);
      void loadHistory();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadCatalogue, loadHistory, portfolioId]);

  const model = useMemo(
    () =>
      catalogue && configuration
        ? buildReportOrderingViewModel(catalogue, configuration)
        : null,
    [catalogue, configuration],
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
  const activeReviewedIntent =
    reviewedIntent?.portfolioId === portfolioId ? reviewedIntent : null;
  const preflightReviewed = Boolean(
    activeReviewedIntent &&
      activeReviewedIntent.configurationFingerprint === currentConfigurationFingerprint &&
      activeReviewedIntent.sourceFingerprint === currentSourceFingerprint,
  );
  const submittedHandle = submittedHandlesByPortfolio[portfolioId] ?? null;
  const activeSubmissionProgress =
    submissionProgress.portfolioId === portfolioId
      ? submissionProgress
      : { portfolioId, state: "idle" as const, error: null };
  const submissionState = submittedHandle ? "accepted" : activeSubmissionProgress.state;
  const submissionError = submittedHandle ? null : activeSubmissionProgress.error;
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
    [catalogue, portfolioId],
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
        current?.configurationFingerprint === fingerprint &&
        current.sourceFingerprint === sourceFingerprintRef.current
      ) {
        return current;
      }
      return {
        portfolioId,
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
  }, [configuration, model?.canSubmit, portfolioId]);

  const submitRequest = useCallback(async () => {
    if (
      !configuration ||
      !model?.canSubmit ||
      !activeReviewedIntent ||
      activeReviewedIntent.configurationFingerprint !== configurationFingerprint(configuration) ||
      activeReviewedIntent.sourceFingerprint !== sourceFingerprintRef.current
    ) {
      return false;
    }

    setSubmissionProgress({ portfolioId, state: "submitting", error: null });
    try {
      const handle = await submitPortfolioReviewOrder({
        portfolioId,
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
      });
      if (activePortfolioIdRef.current !== portfolioId) {
        return false;
      }
      setSubmittedHandlesByPortfolio((current) => ({
        ...current,
        [portfolioId]: handle,
      }));
      setSubmissionProgress({ portfolioId, state: "accepted", error: null });
      await loadHistory();
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
    model?.canSubmit,
    portfolioId,
    publishedConfigurationFieldIds,
    activeReviewedIntent,
  ]);

  const startAnotherReport = useCallback(() => {
    if (!submittedHandle) {
      return false;
    }

    setSubmittedHandlesByPortfolio((current) => {
      const next = { ...current };
      delete next[portfolioId];
      return next;
    });
    setReviewedIntent(null);
    setSubmissionProgress({ portfolioId, state: "idle", error: null });
    return true;
  }, [portfolioId, submittedHandle]);

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
