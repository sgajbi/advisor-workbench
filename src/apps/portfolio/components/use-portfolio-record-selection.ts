"use client";

import { useCallback, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  buildReviewContextHref,
  parseReviewContext,
} from "@/shell/review-context";

type PortfolioRecordSelectionState = Readonly<{
  sourceKey: string;
  recordId: string | null;
}>;

export function usePortfolioRecordSelection({
  portfolioId,
  initialSelectedRecordId,
}: {
  portfolioId: string;
  initialSelectedRecordId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceKey = `${portfolioId}|${initialSelectedRecordId ?? ""}`;
  const [selectionState, setSelectionState] =
    useState<PortfolioRecordSelectionState>({
      sourceKey,
      recordId: initialSelectedRecordId ?? null,
    });
  const selectedRecordId =
    selectionState.sourceKey === sourceKey
      ? selectionState.recordId
      : (initialSelectedRecordId ?? null);

  const navigateToRecord = useCallback(
    (recordId: string | null) => {
      const reviewContextResult = parseReviewContext(searchParams);
      if (reviewContextResult.status === "invalid") {
        return;
      }

      setSelectionState({ sourceKey, recordId });
      const currentQuery = searchParams?.toString() ?? "";
      const currentHref = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
      router.push(
        buildReviewContextHref(currentHref, {
          ...reviewContextResult.context,
          portfolioId,
          selectedRecordId: recordId ?? undefined,
        }),
        { scroll: false },
      );
    },
    [pathname, portfolioId, router, searchParams, sourceKey],
  );

  return {
    selectedRecordId,
    openRecord: useCallback(
      (recordId: string) => navigateToRecord(recordId),
      [navigateToRecord],
    ),
    closeRecord: useCallback(() => navigateToRecord(null), [navigateToRecord]),
  };
}
