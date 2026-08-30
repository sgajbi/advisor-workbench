"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSourceWindow } from "@/design-system";
import { isWorkbenchPermissionBlockedError } from "@/features/workbench/api-client";
import { getDpmCommandCenterExceptions } from "@/features/workbench/dpm-command-center-api";
import {
  getManageExceptionEvidencePosture,
  getManageExceptionNextCursor,
} from "@/features/workbench/manage-workspace-view-model";

import type { ManageWorkspaceData } from "./manage-workspace-data";

type ExceptionResponse = ManageWorkspaceData["commandCenterExceptions"];
type NavigationDirection = "next" | "previous";

type VisibleWindow = {
  scopeKey: string;
  response: ExceptionResponse;
  sourceError: string | null;
};

type FailedNavigation = {
  cursor: string | undefined;
  direction: NavigationDirection;
  permissionBlocked: boolean;
};

function initialVisibleWindow({
  scopeKey,
  response,
  sourceError,
}: {
  scopeKey: string;
  response: ExceptionResponse;
  sourceError: string | null;
}): VisibleWindow {
  return { scopeKey, response, sourceError };
}

export function useManageExceptionSourceWindow({
  portfolioId,
  mandateId,
  initialResponse,
  initialError,
}: {
  portfolioId: string;
  mandateId: string | null;
  initialResponse: ExceptionResponse;
  initialError: string | null;
}) {
  // Manage issues portfolio-scoped cursors. Keep that request scope stable across
  // every source window, while the view scope also fences the selected mandate.
  const requestScopeKey = `${portfolioId}::ACTIVE`;
  const viewScopeKey = `${requestScopeKey}::${mandateId ?? "mandate-unavailable"}`;
  const sourceWindow = useSourceWindow(viewScopeKey);
  const [visibleWindow, setVisibleWindow] = useState<VisibleWindow>(() =>
    initialVisibleWindow({
      scopeKey: viewScopeKey,
      response: initialResponse,
      sourceError: initialError,
    })
  );
  const [isLoading, setIsLoading] = useState(false);
  const [failedNavigation, setFailedNavigation] = useState<FailedNavigation | null>(null);
  const activeScopeRef = useRef(viewScopeKey);
  const requestGenerationRef = useRef(0);
  const activeWindow =
    visibleWindow.scopeKey === viewScopeKey
      ? visibleWindow
      : initialVisibleWindow({
          scopeKey: viewScopeKey,
          response: initialResponse,
          sourceError: initialError,
        });

  if (visibleWindow.scopeKey !== viewScopeKey) {
    setVisibleWindow(activeWindow);
    setIsLoading(false);
    setFailedNavigation(null);
  }

  useEffect(() => {
    activeScopeRef.current = viewScopeKey;
    requestGenerationRef.current += 1;
  }, [viewScopeKey]);

  const loadWindow = useCallback(
    async (cursor: string | undefined, direction: NavigationDirection) => {
      if (
        isLoading ||
        (direction === "next" && !sourceWindow.canShowNext(cursor))
      ) {
        return;
      }
      const initiatingScope = viewScopeKey;
      const requestGeneration = ++requestGenerationRef.current;
      setIsLoading(true);
      setFailedNavigation(null);

      try {
        const response = await getDpmCommandCenterExceptions(
          {
            portfolioId,
            state: "ACTIVE",
            limit: 25,
            cursor,
          },
          "client"
        );
        if (
          requestGenerationRef.current !== requestGeneration ||
          activeScopeRef.current !== initiatingScope
        ) {
          return;
        }
        if (getManageExceptionEvidencePosture(response, null) === "unavailable") {
          throw new Error("The returned attention-item window is not reviewable.");
        }

        setVisibleWindow({ scopeKey: initiatingScope, response, sourceError: null });
        if (direction === "next") {
          sourceWindow.showNext(cursor);
        } else {
          sourceWindow.showPrevious();
        }
      } catch (error) {
        if (
          requestGenerationRef.current === requestGeneration &&
          activeScopeRef.current === initiatingScope
        ) {
          setFailedNavigation({
            cursor,
            direction,
            permissionBlocked: isWorkbenchPermissionBlockedError(error),
          });
        }
      } finally {
        if (
          requestGenerationRef.current === requestGeneration &&
          activeScopeRef.current === initiatingScope
        ) {
          setIsLoading(false);
        }
      }
    },
    [isLoading, portfolioId, sourceWindow, viewScopeKey]
  );

  const nextCursor = getManageExceptionNextCursor(activeWindow.response);
  const canShowNext = sourceWindow.canShowNext(nextCursor);
  const showNext = useCallback(
    async () => await loadWindow(nextCursor ?? undefined, "next"),
    [loadWindow, nextCursor]
  );
  const showPrevious = useCallback(
    async () => await loadWindow(sourceWindow.previousCursor, "previous"),
    [loadWindow, sourceWindow.previousCursor]
  );
  const retry = useCallback(
    async () => {
      if (failedNavigation) {
        await loadWindow(failedNavigation.cursor, failedNavigation.direction);
      }
    },
    [failedNavigation, loadWindow]
  );

  return {
    response: activeWindow.response,
    sourceError: activeWindow.sourceError,
    evidencePosture: getManageExceptionEvidencePosture(
      activeWindow.response,
      activeWindow.sourceError
    ),
    nextCursor,
    canShowNext,
    currentWindow: sourceWindow.windowNumber,
    hasPrevious: sourceWindow.hasPrevious,
    isLoading,
    navigationFailure: failedNavigation
      ? {
          direction: failedNavigation.direction,
          permissionBlocked: failedNavigation.permissionBlocked,
        }
      : null,
    showNext,
    showPrevious,
    retry,
  };
}
