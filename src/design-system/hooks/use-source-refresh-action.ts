"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SourceRefreshState = "pending" | "confirmed" | "failed";

type SourceRefreshOutcome = {
  identity: string;
  state: SourceRefreshState;
};

export function useSourceRefreshAction({
  identity,
  isRefreshing,
  hasRefreshFailure,
  onRefresh,
}: {
  identity: string | null;
  isRefreshing: boolean;
  hasRefreshFailure: boolean;
  onRefresh: () => Promise<unknown>;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const identityRef = useRef(identity);
  const requestGenerationRef = useRef(0);
  const [outcome, setOutcome] = useState<SourceRefreshOutcome | null>(null);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  const reset = useCallback(() => {
    requestGenerationRef.current += 1;
    setOutcome(null);
  }, []);

  const refresh = useCallback(async () => {
    const requestGeneration = ++requestGenerationRef.current;
    const initiatingElement = actionRef.current;
    const initiatingIdentity = identity;
    const shouldRestoreFocus = document.activeElement === initiatingElement;

    if (initiatingIdentity) {
      setOutcome({ identity: initiatingIdentity, state: "pending" });
    }

    try {
      const result = await onRefresh();
      if (
        requestGenerationRef.current === requestGeneration &&
        identityRef.current === initiatingIdentity &&
        initiatingIdentity
      ) {
        setOutcome({
          identity: initiatingIdentity,
          state: refreshResultHasError(result) ? "failed" : "confirmed",
        });
      }
      return result;
    } catch (error) {
      if (
        requestGenerationRef.current === requestGeneration &&
        identityRef.current === initiatingIdentity &&
        initiatingIdentity
      ) {
        setOutcome({ identity: initiatingIdentity, state: "failed" });
      }
      throw error;
    } finally {
      if (shouldRestoreFocus) {
        window.setTimeout(() => {
          const focusDidNotMove =
            document.activeElement === initiatingElement ||
            document.activeElement === document.body;
          if (
            requestGenerationRef.current === requestGeneration &&
            identityRef.current === initiatingIdentity &&
            focusDidNotMove
          ) {
            actionRef.current?.focus();
          }
        }, 0);
      }
    }
  }, [identity, onRefresh]);

  const matchingOutcome = outcome?.identity === identity ? outcome.state : null;
  const refreshState = resolveSourceRefreshState({
    outcome: matchingOutcome,
    isRefreshing,
    hasRefreshFailure,
  });

  return {
    actionRef,
    refresh,
    refreshState,
    reset,
  };
}

function refreshResultHasError(result: unknown): boolean {
  if (Array.isArray(result)) {
    return result.some(refreshResultHasError);
  }
  return (
    typeof result === "object" &&
    result !== null &&
    (("isError" in result && result.isError === true) ||
      ("error" in result &&
        result.error !== null &&
        result.error !== undefined))
  );
}

function resolveSourceRefreshState({
  outcome,
  isRefreshing,
  hasRefreshFailure,
}: {
  outcome: SourceRefreshState | null;
  isRefreshing: boolean;
  hasRefreshFailure: boolean;
}): SourceRefreshState | null {
  if (outcome === "pending" || isRefreshing) return "pending";
  if (outcome === "failed" || hasRefreshFailure) return "failed";
  return outcome;
}
