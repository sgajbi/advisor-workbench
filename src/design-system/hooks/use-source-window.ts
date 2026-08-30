"use client";

import { useCallback, useState } from "react";

type SourceWindowHistory = {
  scopeKey: string;
  cursors: Array<string | undefined>;
  baseWindowNumber: number;
  addressedCursor?: string;
  addressedWindowNumber: number;
  index: number;
};

type InitialSourceWindow = Readonly<{
  cursor?: string;
  windowNumber?: number;
}>;

function createInitialHistory(
  scopeKey: string,
  initial?: InitialSourceWindow,
): SourceWindowHistory {
  return {
    scopeKey,
    cursors: [initial?.cursor],
    baseWindowNumber: initial?.windowNumber ?? 1,
    addressedCursor: initial?.cursor,
    addressedWindowNumber: initial?.windowNumber ?? 1,
    index: 0,
  };
}

function reconcileAddressedHistory(
  history: SourceWindowHistory,
  scopeKey: string,
  initial?: InitialSourceWindow,
): SourceWindowHistory {
  if (history.scopeKey !== scopeKey) {
    return createInitialHistory(scopeKey, initial);
  }

  const addressedCursor = initial?.cursor;
  const addressedWindowNumber = initial?.windowNumber ?? 1;
  if (
    history.addressedCursor === addressedCursor
    && history.addressedWindowNumber === addressedWindowNumber
  ) {
    return history;
  }

  const activeCursor = history.cursors[history.index];
  const activeWindowNumber = history.baseWindowNumber + history.index;
  if (
    activeCursor === addressedCursor
    && activeWindowNumber === addressedWindowNumber
  ) {
    return { ...history, addressedCursor, addressedWindowNumber };
  }

  return createInitialHistory(scopeKey, initial);
}

/**
 * Keeps bounded cursor history for a source-owned result set.
 *
 * Fetching and evidence identity remain with the consumer so domain workflows
 * can fence late responses and retain the last confirmed source window.
 */
export function useSourceWindow(
  scopeKey: string,
  initial?: InitialSourceWindow,
) {
  const [sourceHistory, setSourceHistory] = useState<SourceWindowHistory>(() =>
    createInitialHistory(scopeKey, initial)
  );
  const activeHistory = reconcileAddressedHistory(
    sourceHistory,
    scopeKey,
    initial,
  );

  if (sourceHistory !== activeHistory) {
    setSourceHistory(activeHistory);
  }

  const showNext = useCallback(
    (nextCursor?: string | null) => {
      if (!nextCursor) {
        return;
      }
      setSourceHistory((current) => {
        const scopedHistory = reconcileAddressedHistory(
          current,
          scopeKey,
          initial,
        );
        if (scopedHistory.cursors[scopedHistory.index] === nextCursor) {
          return scopedHistory;
        }
        return {
          ...scopedHistory,
          cursors: [
            ...scopedHistory.cursors.slice(0, scopedHistory.index + 1),
            nextCursor,
          ],
          index: scopedHistory.index + 1,
        };
      });
    },
    [initial, scopeKey]
  );

  const showPrevious = useCallback(() => {
    setSourceHistory((current) => {
      const scopedHistory = reconcileAddressedHistory(
        current,
        scopeKey,
        initial,
      );
      return {
        ...scopedHistory,
        index: Math.max(0, scopedHistory.index - 1),
      };
    });
  }, [initial, scopeKey]);

  return {
    cursor: activeHistory.cursors[activeHistory.index],
    previousCursor:
      activeHistory.index > 0
        ? activeHistory.cursors[activeHistory.index - 1]
        : undefined,
    windowNumber: activeHistory.baseWindowNumber + activeHistory.index,
    hasPrevious: activeHistory.index > 0,
    showNext,
    showPrevious,
  };
}
