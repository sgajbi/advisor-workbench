"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getWorkbenchApiErrorEvidence,
  isWorkbenchPermissionBlockedError,
} from "@/features/workbench/api-client";

export type SourceConfirmedResourceState<T> =
  | { status: "loading"; value: null; httpStatus: null }
  | { status: "ready"; value: T; httpStatus: null }
  | {
      status: "error" | "permission_blocked" | "source_mismatch";
      value: null;
      httpStatus: number | null;
    };

type RefreshRequest = {
  requestKey: string;
  sequence: number;
};

type KeyedResourceState<T> = {
  requestKey: string;
  state: SourceConfirmedResourceState<T>;
};

const LOADING_RESOURCE_STATE = {
  status: "loading",
  value: null,
  httpStatus: null,
} as const;

export class SourceEvidenceMismatchError extends Error {}

/**
 * Owns the browser lifecycle for independently fetched, source-confirmed evidence.
 * Only successful source responses enter the exact-request cache. Permission denials
 * revoke matching cached evidence even when their UI completion has become obsolete.
 */
export function useSourceConfirmedResource<T>({
  requestKey,
  load,
}: {
  requestKey: string;
  load: () => Promise<T>;
}) {
  const [refreshRequest, setRefreshRequest] = useState<RefreshRequest>({
    requestKey: "",
    sequence: 0,
  });
  const [keyedState, setKeyedState] = useState<KeyedResourceState<T>>({
    requestKey: "",
    state: LOADING_RESOURCE_STATE,
  });
  const latestRequestIdRef = useRef(0);
  const consumedRefreshSequenceRef = useRef(0);
  const cacheRef = useRef<Map<string, T>>(new Map());

  useEffect(() => {
    const forceRefresh =
      refreshRequest.requestKey === requestKey &&
      refreshRequest.sequence > consumedRefreshSequenceRef.current;
    if (forceRefresh) {
      consumedRefreshSequenceRef.current = refreshRequest.sequence;
    }

    const cached = cacheRef.current.get(requestKey);
    if (cached && !forceRefresh) {
      setKeyedState({
        requestKey,
        state: { status: "ready", value: cached, httpStatus: null },
      });
      return;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setKeyedState({ requestKey, state: LOADING_RESOURCE_STATE });

    void load()
      .then((value) => {
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        cacheRef.current.set(requestKey, value);
        setKeyedState({
          requestKey,
          state: { status: "ready", value, httpStatus: null },
        });
      })
      .catch((error: unknown) => {
        const permissionBlocked = isWorkbenchPermissionBlockedError(error);
        const sourceMismatch = error instanceof SourceEvidenceMismatchError;
        if (permissionBlocked || sourceMismatch) {
          cacheRef.current.delete(requestKey);
        }
        if (latestRequestIdRef.current !== requestId) {
          return;
        }
        const errorEvidence = getWorkbenchApiErrorEvidence(error);
        setKeyedState({
          requestKey,
          state: {
            status: permissionBlocked
              ? "permission_blocked"
              : sourceMismatch
                ? "source_mismatch"
                : "error",
            value: null,
            httpStatus: errorEvidence ? Number(errorEvidence.value) : null,
          },
        });
      });

    return () => {
      if (latestRequestIdRef.current === requestId) {
        latestRequestIdRef.current += 1;
      }
    };
  }, [load, refreshRequest.requestKey, refreshRequest.sequence, requestKey]);

  const refresh = useCallback(() => {
    setRefreshRequest((current) => ({
      requestKey,
      sequence: current.sequence + 1,
    }));
  }, [requestKey]);

  const state =
    keyedState.requestKey === requestKey
      ? keyedState.state
      : LOADING_RESOURCE_STATE;

  return { state, refresh, requestKey };
}
