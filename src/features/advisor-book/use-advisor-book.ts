"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getAdvisorBook, type AdvisorBookQuery } from "./api";
import type { AdvisorBookResponse } from "./contracts";

type AdvisorBookLoadState = {
  requestKey: string;
  status: "loading" | "ready" | "error";
  response: AdvisorBookResponse | null;
  error: unknown;
};

export function useAdvisorBook(
  query: AdvisorBookQuery,
  options: { recoverOutOfRange?: boolean } = {},
) {
  const {
    asOfDate,
    clientId,
    mandateType,
    sortBy,
    sortOrder,
    offset,
    limit,
  } = query;
  const requestKey = JSON.stringify({
    asOfDate,
    clientId,
    mandateType,
    sortBy,
    sortOrder,
    offset,
    limit,
  });
  const [loadState, setLoadState] = useState<AdvisorBookLoadState>({
    requestKey,
    status: "loading",
    response: null,
    error: null,
  });
  const activeLoadState =
    loadState.requestKey === requestKey
      ? loadState
      : {
          requestKey,
          status: "loading" as const,
          response: null,
          error: null,
        };
  const loading = activeLoadState.status === "loading";
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoadState((current) => ({
      requestKey,
      status: "loading",
      response: current.requestKey === requestKey ? current.response : null,
      error: null,
    }));
    try {
      let nextResponse = await getAdvisorBook({
        asOfDate,
        clientId,
        mandateType,
        sortBy,
        sortOrder,
        offset,
        limit,
      });
      if (
        options.recoverOutOfRange &&
        nextResponse.items.length === 0 &&
        nextResponse.page.total_count > 0 &&
        nextResponse.page.offset >= nextResponse.page.total_count
      ) {
        if (requestId !== requestSequence.current) {
          return;
        }
        nextResponse = await getAdvisorBook({
          asOfDate,
          clientId,
          mandateType,
          sortBy,
          sortOrder,
          offset:
            Math.floor((nextResponse.page.total_count - 1) / nextResponse.page.limit) *
            nextResponse.page.limit,
          limit: nextResponse.page.limit,
        });
      }
      if (requestId === requestSequence.current) {
        setLoadState({
          requestKey,
          status: "ready",
          response: nextResponse,
          error: null,
        });
      }
    } catch (nextError) {
      if (requestId === requestSequence.current) {
        setLoadState({
          requestKey,
          status: "error",
          response: null,
          error: nextError,
        });
      }
    }
  }, [
    asOfDate,
    clientId,
    limit,
    mandateType,
    offset,
    options.recoverOutOfRange,
    requestKey,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      requestSequence.current += 1;
    };
  }, [load]);

  return {
    response: activeLoadState.response,
    loading,
    error: activeLoadState.error,
    reload: load,
  };
}
