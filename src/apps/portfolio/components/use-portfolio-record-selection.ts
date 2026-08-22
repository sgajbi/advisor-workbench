"use client";

import { useCallback, useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildPortfolioRecordSelectionHref } from "../portfolio-record-selection";

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
  const listHref = useMemo(
    () =>
      buildPortfolioRecordSelectionHref({
        pathname,
        searchParams,
        portfolioId,
      }),
    [pathname, portfolioId, searchParams],
  );

  const navigateToRecord = useCallback(
    (recordId: string | null) => {
      const href = buildPortfolioRecordSelectionHref({
        pathname,
        searchParams,
        portfolioId,
        selectedRecordId: recordId ?? undefined,
      });
      if (!href) {
        return;
      }

      setSelectionState({ sourceKey, recordId });
      router.push(href, { scroll: false });
    },
    [pathname, portfolioId, router, searchParams, sourceKey],
  );

  return {
    selectedRecordId,
    listHref,
    openRecord: useCallback(
      (recordId: string) => navigateToRecord(recordId),
      [navigateToRecord],
    ),
    closeRecord: useCallback(() => navigateToRecord(null), [navigateToRecord]),
  };
}
