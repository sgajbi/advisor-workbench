"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";

import { ingestPortfolioBundle } from "./api";
import { parseIntakeCsvToBundle } from "./csv-parser";
import {
  buildIntakeReviewProjection,
  createBlankIntakeDraft,
  intakeDraftFingerprint,
  validateIntakeDraft,
  type IntakeDraft,
  type IntakeReviewProjection,
  type IntakeTask,
} from "./draft";
import { getCurrencyLookups, getInstrumentLookups, getPortfolioLookups } from "./lookups-api";
import { buildIntakeReceipt, type IntakeReceipt } from "./receipt";
import {
  resolveIntakeSubmissionAttempt,
  type IntakeSubmissionAttempt,
} from "./submission-idempotency";

type SubmissionState = "idle" | "submitting" | "error" | "accepted";
type FileParseState = "idle" | "parsing" | "ready" | "error";
type ReferenceDataState = "manual" | "loading" | "available" | "unavailable";

type ReviewedIntent = IntakeSubmissionAttempt & {
  projection: IntakeReviewProjection;
};

export function useIntakeWorkflow() {
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [reviewedIntent, setReviewedIntent] = useState<ReviewedIntent | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<IntakeReceipt | null>(null);
  const [fileParseState, setFileParseState] = useState<FileParseState>("idle");
  const [fileParseError, setFileParseError] = useState<string | null>(null);
  const [referenceDataRequested, setReferenceDataRequested] = useState(false);
  const activeFileReadRef = useRef(0);
  const draftGenerationRef = useRef(0);

  const portfolioLookupQuery = useQuery({
    queryKey: ["intake-lookups", "portfolios"],
    queryFn: async () => await getPortfolioLookups({ limit: 500 }),
    enabled: referenceDataRequested,
    ...workbenchStrictQueryDefaults,
  });
  const instrumentLookupQuery = useQuery({
    queryKey: ["intake-lookups", "instruments"],
    queryFn: async () => await getInstrumentLookups({ limit: 500 }),
    enabled: referenceDataRequested,
    ...workbenchStrictQueryDefaults,
  });
  const currencyLookupQuery = useQuery({
    queryKey: ["intake-lookups", "currencies"],
    queryFn: async () => await getCurrencyLookups({ source: "ALL", limit: 100 }),
    enabled: referenceDataRequested,
    ...workbenchStrictQueryDefaults,
  });

  const validationIssues = useMemo(() => (draft ? validateIntakeDraft(draft) : []), [draft]);
  const referenceDataState = resolveReferenceDataState({
    requested: referenceDataRequested,
    loading:
      portfolioLookupQuery.isLoading ||
      instrumentLookupQuery.isLoading ||
      currencyLookupQuery.isLoading,
    failed:
      portfolioLookupQuery.isError ||
      instrumentLookupQuery.isError ||
      currencyLookupQuery.isError,
    empty:
      (portfolioLookupQuery.data?.length ?? 0) === 0 ||
      (instrumentLookupQuery.data?.length ?? 0) === 0 ||
      (currencyLookupQuery.data?.length ?? 0) === 0,
  });

  function selectTask(task: IntakeTask) {
    activeFileReadRef.current += 1;
    draftGenerationRef.current += 1;
    setDraft(createBlankIntakeDraft(task));
    setValidationAttempted(false);
    setReviewedIntent(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setReceipt(null);
    setFileParseState("idle");
    setFileParseError(null);
  }

  function updateDraft(updater: (current: IntakeDraft) => IntakeDraft) {
    draftGenerationRef.current += 1;
    setDraft((current) => (current ? updater(current) : current));
    setReviewedIntent(null);
    setReceipt(null);
    setSubmissionState("idle");
    setSubmissionError(null);
  }

  function reviewRequest(): boolean {
    if (!draft) return false;
    setValidationAttempted(true);
    if (validationIssues.length > 0) return false;

    const fingerprint = intakeDraftFingerprint(draft);
    setReviewedIntent((current) => {
      if (current?.fingerprint === fingerprint) return current;
      return {
        ...resolveIntakeSubmissionAttempt(null, submissionScope(draft.task), fingerprint),
        projection: buildIntakeReviewProjection(draft),
      };
    });
    setSubmissionError(null);
    return true;
  }

  async function submitReviewedRequest(): Promise<boolean> {
    if (!draft || !reviewedIntent || reviewedIntent.fingerprint !== intakeDraftFingerprint(draft)) {
      return false;
    }

    const submittedGeneration = draftGenerationRef.current;
    const submittedIntent = reviewedIntent;
    setSubmissionState("submitting");
    setSubmissionError(null);
    try {
      const response = await ingestPortfolioBundle(submittedIntent.projection.payload, {
        idempotencyKey: submittedIntent.idempotencyKey,
      });
      if (draftGenerationRef.current !== submittedGeneration) return false;
      setReceipt(buildIntakeReceipt(draft.task, submittedIntent.projection.payload, response));
      setSubmissionState("accepted");
      return true;
    } catch (error) {
      if (draftGenerationRef.current !== submittedGeneration) return false;
      setSubmissionState("error");
      setSubmissionError(intakeSubmissionErrorCopy(error));
      return false;
    }
  }

  async function parseFile(file: File): Promise<boolean> {
    if (draft?.task !== "IMPORT_FILE") return false;
    const readSequence = ++activeFileReadRef.current;
    draftGenerationRef.current += 1;
    setDraft({ task: "IMPORT_FILE", fileName: file.name, payload: null });
    setFileParseState("parsing");
    setFileParseError(null);
    setReviewedIntent(null);
    setReceipt(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    try {
      const payload = parseIntakeCsvToBundle(await readFileText(file));
      if (readSequence !== activeFileReadRef.current) return false;
      draftGenerationRef.current += 1;
      setDraft({ task: "IMPORT_FILE", fileName: file.name, payload });
      setValidationAttempted(false);
      setFileParseState("ready");
      return true;
    } catch (error) {
      if (readSequence !== activeFileReadRef.current) return false;
      draftGenerationRef.current += 1;
      setDraft({ task: "IMPORT_FILE", fileName: null, payload: null });
      setValidationAttempted(true);
      setFileParseState("error");
      setFileParseError(fileParseErrorCopy(error));
      return false;
    }
  }

  function startAnotherRequest() {
    activeFileReadRef.current += 1;
    draftGenerationRef.current += 1;
    setDraft(null);
    setValidationAttempted(false);
    setReviewedIntent(null);
    setSubmissionState("idle");
    setSubmissionError(null);
    setReceipt(null);
    setFileParseState("idle");
    setFileParseError(null);
  }

  function loadReferenceData() {
    if (!referenceDataRequested) {
      setReferenceDataRequested(true);
      return;
    }
    void portfolioLookupQuery.refetch();
    void instrumentLookupQuery.refetch();
    void currencyLookupQuery.refetch();
  }

  return {
    draft,
    validationAttempted,
    validationIssues,
    reviewedIntent,
    submissionState,
    submissionError,
    receipt,
    fileParseState,
    fileParseError,
    referenceDataState,
    portfolioOptions: unique(portfolioLookupQuery.data?.map((item) => item.id) ?? []),
    instrumentOptions: unique(instrumentLookupQuery.data?.map((item) => item.id) ?? []),
    currencyOptions: unique(currencyLookupQuery.data?.map((item) => item.id) ?? []),
    selectTask,
    updateDraft,
    reviewRequest,
    submitReviewedRequest,
    parseFile,
    startAnotherRequest,
    loadReferenceData,
  };
}

function submissionScope(task: IntakeTask) {
  return task === "IMPORT_FILE" ? "CSV_BUNDLE" : task;
}

function resolveReferenceDataState({
  requested,
  loading,
  failed,
  empty,
}: {
  requested: boolean;
  loading: boolean;
  failed: boolean;
  empty: boolean;
}): ReferenceDataState {
  if (!requested) return "manual";
  if (loading) return "loading";
  if (failed || empty) return "unavailable";
  return "available";
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function intakeSubmissionErrorCopy(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "The reviewed intake request was not accepted. Your request remains available to retry.";
}

function fileParseErrorCopy(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? `The file could not be prepared for review. ${error.message}`
    : "The file could not be prepared for review. Check the supported columns and try again.";
}

async function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return await file.text();
  }

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("The selected file could not be read."));
    });
    reader.readAsText(file);
  });
}
