"use client";

import { useCallback, useState } from "react";

type ProposalSourceHistory = {
  scopeKey: string;
  cursors: Array<string | undefined>;
  index: number;
};

function createInitialHistory(scopeKey: string): ProposalSourceHistory {
  return { scopeKey, cursors: [undefined], index: 0 };
}

export function useProposalSourceWindow(scopeKey: string) {
  const [sourceHistory, setSourceHistory] = useState<ProposalSourceHistory>(() =>
    createInitialHistory(scopeKey)
  );
  const activeHistory =
    sourceHistory.scopeKey === scopeKey ? sourceHistory : createInitialHistory(scopeKey);

  if (sourceHistory.scopeKey !== scopeKey) {
    setSourceHistory(activeHistory);
  }

  const showNext = useCallback(
    (nextCursor?: string | null) => {
      if (!nextCursor) {
        return;
      }
      setSourceHistory((current) => {
        const scopedHistory =
          current.scopeKey === scopeKey ? current : createInitialHistory(scopeKey);
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
    [scopeKey]
  );

  const showPrevious = useCallback(() => {
    setSourceHistory((current) => {
      const scopedHistory =
        current.scopeKey === scopeKey ? current : createInitialHistory(scopeKey);
      return {
        ...scopedHistory,
        index: Math.max(0, scopedHistory.index - 1),
      };
    });
  }, [scopeKey]);

  return {
    cursor: activeHistory.cursors[activeHistory.index],
    windowNumber: activeHistory.index + 1,
    hasPrevious: activeHistory.index > 0,
    showNext,
    showPrevious,
  };
}
