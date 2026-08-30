"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { recordAdvisorIdeaPresentationReceipt } from "./api";
import {
  buildIdeaPresentationReceiptDrafts,
  readIdeaPresentationSource,
  type IdeaPresentationSource,
  type IdeaPresentationReceiptDraft,
} from "./idea-presentation-receipt";
import type { AdvisorIdeaReviewQueueData } from "./types";

const VISIBILITY_THRESHOLD = 0.5;
const MARKER_SELECTOR = "[data-idea-presentation-candidate]";

type ReceiptTransaction = {
  candidateId: string;
  idempotencyKey: string;
  request: IdeaPresentationReceiptDraft;
  status: "pending" | "recorded" | "failed";
};

export type IdeaPresentationReceiptState = {
  status: "ready" | "recording" | "attention" | "unavailable";
  failedCount: number;
  retryFailed: () => Promise<void>;
};

export function useIdeaPresentationReceipts({
  containerRef,
  enabled,
  portfolioId,
  queue,
}: {
  containerRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  portfolioId: string;
  queue?: AdvisorIdeaReviewQueueData;
}): IdeaPresentationReceiptState {
  const transactions = useRef(new Map<string, ReceiptTransaction>());
  const draftingCandidates = useRef(new Set<string>());
  const [summary, setSummary] = useState<
    Pick<IdeaPresentationReceiptState, "status" | "failedCount">
  >({ status: "ready", failedCount: 0 });
  const sources = useMemo(() => {
    const sourceMap = new Map<string, IdeaPresentationSource>();
    for (const item of queue?.items ?? []) {
      if (!queue) {
        continue;
      }
      const source = readIdeaPresentationSource(queue, item);
      if (source) {
        sourceMap.set(source.candidateId, source);
      }
    }
    return sourceMap;
  }, [queue]);
  const snapshotKey = useMemo(
    () =>
      JSON.stringify([
        queue?.evaluatedAtUtc,
        queue?.policyVersion,
        (queue?.items ?? []).map((item) => [
          item.rank,
          item.candidate?.candidateId,
          item.candidate?.materialVersion,
          item.candidate?.evidenceVersion,
          item.candidate?.scorePolicyVersion,
        ]),
      ]),
    [queue],
  );

  const refreshSummary = useCallback(() => {
    const entries = [...transactions.current.values()];
    const failedCount = entries.filter((entry) => entry.status === "failed").length;
    setSummary({
      status: failedCount > 0
        ? "attention"
        : entries.some((entry) => entry.status === "pending")
          ? "recording"
          : "ready",
      failedCount,
    });
  }, []);

  const submit = useCallback(
    async (transaction: ReceiptTransaction) => {
      try {
        await recordAdvisorIdeaPresentationReceipt({
          candidateId: transaction.candidateId,
          portfolioId,
          idempotencyKey: transaction.idempotencyKey,
          request: transaction.request,
        });
        transaction.status = "recorded";
      } catch {
        transaction.status = "failed";
      } finally {
        refreshSummary();
      }
    },
    [portfolioId, refreshSummary],
  );

  const emitVisibleSet = useCallback(
    async (visibleCandidateIds: string[]) => {
      const pendingCandidateIds = visibleCandidateIds.filter(
        (candidateId) =>
          !transactions.current.has(candidateId) &&
          !draftingCandidates.current.has(candidateId),
      );
      if (pendingCandidateIds.length === 0) {
        return;
      }
      for (const candidateId of pendingCandidateIds) {
        draftingCandidates.current.add(candidateId);
      }
      let drafts: Awaited<ReturnType<typeof buildIdeaPresentationReceiptDrafts>>;
      try {
        drafts = await buildIdeaPresentationReceiptDrafts({
          presentedAtUtc: new Date().toISOString(),
          sources,
          visibleCandidateIds,
        });
      } catch {
        for (const candidateId of pendingCandidateIds) {
          draftingCandidates.current.delete(candidateId);
        }
        setSummary({ status: "unavailable", failedCount: pendingCandidateIds.length });
        return;
      }
      const newTransactions = drafts
        .filter(({ candidateId }) => pendingCandidateIds.includes(candidateId))
        .map(({ candidateId, request }) => ({
          candidateId,
          idempotencyKey: globalThis.crypto.randomUUID(),
          request,
          status: "pending" as const,
        }));
      for (const transaction of newTransactions) {
        draftingCandidates.current.delete(transaction.candidateId);
        transactions.current.set(transaction.candidateId, transaction);
      }
      refreshSummary();
      await Promise.all(newTransactions.map(submit));
    },
    [refreshSummary, sources, submit],
  );

  useEffect(() => {
    transactions.current.clear();
    draftingCandidates.current.clear();
    setSummary({ status: "ready", failedCount: 0 });
  }, [snapshotKey]);

  useEffect(() => {
    const root = containerRef.current;
    if (!enabled || !queue || !root) {
      return;
    }
    if (!("IntersectionObserver" in globalThis)) {
      setSummary({ status: "unavailable", failedCount: 0 });
      return;
    }

    const observed = new Set<Element>();
    const intersecting = new Map<Element, boolean>();
    let flushScheduled = false;
    const flush = () => {
      flushScheduled = false;
      if (document.visibilityState !== "visible") {
        return;
      }
      const markers = [...observed]
        .filter((marker) => marker.isConnected && intersecting.get(marker) === true)
        .sort(compareVisualOrder);
      const visibleCandidateIds = [
        ...new Set(
          markers
            .map((marker) => marker.getAttribute("data-idea-presentation-candidate"))
            .filter((candidateId): candidateId is string => Boolean(candidateId)),
        ),
      ];
      if (visibleCandidateIds.length > 0) {
        void emitVisibleSet(visibleCandidateIds);
      }
    };
    const scheduleFlush = () => {
      if (!flushScheduled) {
        flushScheduled = true;
        queueMicrotask(flush);
      }
    };
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          intersecting.set(
            entry.target,
            entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_THRESHOLD,
          );
        }
        scheduleFlush();
      },
      { root, threshold: VISIBILITY_THRESHOLD },
    );
    const observeMarkers = () => {
      for (const marker of observed) {
        if (!marker.isConnected) {
          intersectionObserver.unobserve(marker);
          observed.delete(marker);
          intersecting.delete(marker);
        }
      }
      for (const marker of root.querySelectorAll(MARKER_SELECTOR)) {
        if (!observed.has(marker)) {
          observed.add(marker);
          intersectionObserver.observe(marker);
        }
      }
    };
    const mutationObserver = new MutationObserver(observeMarkers);
    mutationObserver.observe(root, { childList: true, subtree: true });
    observeMarkers();
    document.addEventListener("visibilitychange", scheduleFlush);

    return () => {
      document.removeEventListener("visibilitychange", scheduleFlush);
      mutationObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [containerRef, emitVisibleSet, enabled, queue, snapshotKey]);

  const retryFailed = useCallback(async () => {
    const failed = [...transactions.current.values()].filter(
      (transaction) => transaction.status === "failed",
    );
    for (const transaction of failed) {
      transaction.status = "pending";
    }
    refreshSummary();
    await Promise.all(failed.map(submit));
  }, [refreshSummary, submit]);

  return { ...summary, retryFailed };
}

function compareVisualOrder(left: Element, right: Element): number {
  const leftRect = left.getBoundingClientRect();
  const rightRect = right.getBoundingClientRect();
  return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
}
