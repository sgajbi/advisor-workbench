"use client";

import { useCallback, useState } from "react";

export function useProposalSourceWindow() {
  const [sourceHistory, setSourceHistory] = useState<{
    cursors: Array<string | undefined>;
    index: number;
  }>({ cursors: [undefined], index: 0 });

  const showNext = useCallback(
    (nextCursor?: string | null) => {
      if (!nextCursor) {
        return;
      }
      setSourceHistory((current) => {
        if (current.cursors[current.index] === nextCursor) {
          return current;
        }
        return {
          cursors: [...current.cursors.slice(0, current.index + 1), nextCursor],
          index: current.index + 1,
        };
      });
    },
    []
  );

  const showPrevious = useCallback(() => {
    setSourceHistory((current) => ({
      ...current,
      index: Math.max(0, current.index - 1),
    }));
  }, []);

  return {
    cursor: sourceHistory.cursors[sourceHistory.index],
    windowNumber: sourceHistory.index + 1,
    hasPrevious: sourceHistory.index > 0,
    showNext,
    showPrevious,
  };
}
