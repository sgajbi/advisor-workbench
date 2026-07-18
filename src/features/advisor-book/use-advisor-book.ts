"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getAdvisorBook, type AdvisorBookQuery } from "./api";
import type { AdvisorBookResponse } from "./contracts";

export function useAdvisorBook(query: AdvisorBookQuery) {
  const {
    asOfDate,
    clientId,
    mandateType,
    sortBy,
    sortOrder,
    offset,
    limit,
  } = query;
  const [response, setResponse] = useState<AdvisorBookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const nextResponse = await getAdvisorBook({
        asOfDate,
        clientId,
        mandateType,
        sortBy,
        sortOrder,
        offset,
        limit,
      });
      if (requestId === requestSequence.current) {
        setResponse(nextResponse);
      }
    } catch (nextError) {
      if (requestId === requestSequence.current) {
        setResponse(null);
        setError(nextError);
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
      }
    }
  }, [asOfDate, clientId, limit, mandateType, offset, sortBy, sortOrder]);

  useEffect(() => {
    void load();
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  return { response, loading, error, reload: load };
}
