"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  WorkbenchToolbarPlaceholder,
} from "@/design-system";
import { useClientMounted } from "@/design-system/hooks/use-client-mounted";

import {
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
} from "../api";
import { buildPortfolioSummaryDetailsRequest } from "../portfolio-workspace-client-view-model";
import type { PortfolioCatalogResponse, PortfolioWorkspace } from "../types";
import {
  buildInitialPortfolioControls,
  buildPortfolioExportPayload,
  buildPortfolioWorkspaceContext,
  derivePortfolioWorkspace,
  getOrderedWorkflowCues,
  type PortfolioTimeWindow,
  type PortfolioWorkspaceControls,
} from "../view-model";
import PortfolioUnavailableWorkspace from "./portfolio-unavailable-workspace";
import PortfolioPageLayout from "./portfolio-page-layout";
import PortfolioWorkspaceToolbar from "./portfolio-workspace-toolbar";
import PortfolioWorkspaceView from "./portfolio-workspace";

const summaryDetailsInflightRequests = new Map<
  string,
  ReturnType<typeof getPortfolioWorkspaceSummaryDetails>
>();
const shellInflightRequests = new Map<
  string,
  ReturnType<typeof getPortfolioWorkspaceShell>
>();

type WorkspaceStateDraft = {
  sourceKey: string;
  workspace: PortfolioWorkspace | null;
};

type ShellRequestState = {
  sourceKey: string;
  status: "idle" | "loading" | "loaded" | "unavailable";
};

export default function PortfolioWorkspaceClient({
  portfolios,
  selectedPortfolioId,
  initialWorkspace,
}: {
  portfolios: PortfolioCatalogResponse["items"];
  selectedPortfolioId: string | null;
  initialWorkspace: PortfolioWorkspace | null;
}) {
  const [controls, setControls] = useState<PortfolioWorkspaceControls>(
    buildInitialPortfolioControls(initialWorkspace)
  );
  const initialWorkspaceSourceKey = useMemo(
    () => buildPortfolioWorkspaceSourceKey(selectedPortfolioId, initialWorkspace),
    [initialWorkspace, selectedPortfolioId]
  );
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceStateDraft>({
    sourceKey: initialWorkspaceSourceKey,
    workspace: initialWorkspace,
  });
  const shellRequestRef = useRef<ShellRequestState>({
    sourceKey: initialWorkspaceSourceKey,
    status: initialWorkspace ? "loaded" : "idle",
  });
  const workspaceState =
    workspaceDraft.sourceKey === initialWorkspaceSourceKey
      ? workspaceDraft.workspace
      : initialWorkspace;
  const setWorkspaceState = useCallback(
    (
      next:
        | PortfolioWorkspace
        | null
        | ((current: PortfolioWorkspace | null) => PortfolioWorkspace | null),
    ) => {
      setWorkspaceDraft((current) => {
        const currentWorkspace =
          current.sourceKey === initialWorkspaceSourceKey
            ? current.workspace
            : initialWorkspace;
        return {
          sourceKey: initialWorkspaceSourceKey,
          workspace:
            typeof next === "function" ? next(currentWorkspace) : next,
        };
      });
    },
    [initialWorkspace, initialWorkspaceSourceKey],
  );
  const interactiveReady = useClientMounted();
  const summaryRequestRef = useRef<{ key: string; status: "loading" | "loaded" } | null>(null);
  const context = useMemo(
    () => buildPortfolioWorkspaceContext(workspaceState, controls),
    [controls, workspaceState]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadShellWorkspace() {
      if (shellRequestRef.current.sourceKey !== initialWorkspaceSourceKey) {
        shellRequestRef.current = {
          sourceKey: initialWorkspaceSourceKey,
          status: initialWorkspace ? "loaded" : "idle",
        };
      }
      if (
        !selectedPortfolioId ||
        workspaceState ||
        initialWorkspace ||
        shellRequestRef.current.status !== "idle"
      ) {
        return;
      }

      shellRequestRef.current = {
        sourceKey: initialWorkspaceSourceKey,
        status: "loading",
      };
      const shellWorkspace = await getPortfolioWorkspaceShellOnce(selectedPortfolioId);
      if (cancelled) {
        return;
      }

      if (shellWorkspace) {
        setControls((current) => {
          const defaults = buildInitialPortfolioControls(shellWorkspace);
          return {
            ...defaults,
            timeWindow: current.timeWindow,
          };
        });
        setWorkspaceState(shellWorkspace);
        shellRequestRef.current = {
          sourceKey: initialWorkspaceSourceKey,
          status: "loaded",
        };
        return;
      }
      shellRequestRef.current = {
        sourceKey: initialWorkspaceSourceKey,
        status: "unavailable",
      };
    }

    void loadShellWorkspace();

    return () => {
      cancelled = true;
      if (
        shellRequestRef.current.sourceKey === initialWorkspaceSourceKey &&
        shellRequestRef.current.status === "loading"
      ) {
        shellRequestRef.current = {
          sourceKey: initialWorkspaceSourceKey,
          status: "idle",
        };
      }
    };
  }, [
    initialWorkspace,
    initialWorkspaceSourceKey,
    selectedPortfolioId,
    setWorkspaceState,
    workspaceState,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaryDetails() {
      if (!selectedPortfolioId || !workspaceState) {
        return;
      }

      const request = buildPortfolioSummaryDetailsRequest(selectedPortfolioId, context);
      const scopedRequestKey = `${initialWorkspaceSourceKey}|${request.key}`;
      if (summaryRequestRef.current?.key === scopedRequestKey) {
        return;
      }

      summaryRequestRef.current = { key: scopedRequestKey, status: "loading" };
      const details = await getPortfolioWorkspaceSummaryDetailsOnce(
        scopedRequestKey,
        selectedPortfolioId,
        request.params
      );
      if (cancelled) {
        return;
      }

      if (details) {
        setWorkspaceState((current) =>
          current ? mergePortfolioWorkspace(current, details) : current
        );
      }
      summaryRequestRef.current = { key: scopedRequestKey, status: "loaded" };
    }

    void loadSummaryDetails();

    return () => {
      cancelled = true;
    };
  }, [
    context,
    initialWorkspaceSourceKey,
    selectedPortfolioId,
    setWorkspaceState,
    workspaceState,
  ]);

  const workspace = useMemo(
    () => derivePortfolioWorkspace(workspaceState, controls),
    [controls, workspaceState]
  );
  function handleControlsChange(patch: Partial<PortfolioWorkspaceControls>) {
    setControls((current) => applyPortfolioControlPatch(current, patch));
  }

  function handleExport() {
    const payload = buildPortfolioExportPayload(workspace, context);
    if (!payload || !workspace) {
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${workspace.portfolio.portfolio_id}-${context.selectedAsOfDate}.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  return (
    <PortfolioPageLayout>
      {!portfolios.length ? (
        <PortfolioUnavailableWorkspace />
      ) : (
        <PortfolioWorkspaceView
          workspace={workspace}
          context={context}
          toolbar={
            !interactiveReady ? (
              <div className="workbench-toolbar-placeholder-stack">
                <WorkbenchToolbarPlaceholder
                  className="portfolio-workspace-toolbar"
                  contextMessage="Loading portfolio controls…"
                  fields={[
                    { key: "as-of", label: "As of" },
                    { key: "reporting-currency", label: "Reporting Currency" },
                    { key: "period", label: "Period", width: "period" },
                  ]}
                />
              </div>
            ) : (
              <PortfolioWorkspaceToolbar
                controls={controls}
                context={context}
                onControlsChange={handleControlsChange}
                onExport={handleExport}
                quickActions={workspaceState ? getOrderedWorkflowCues(workspaceState) : []}
              />
            )
          }
        />
      )}
    </PortfolioPageLayout>
  );
}

function applyPortfolioControlPatch(
  current: PortfolioWorkspaceControls,
  patch: Partial<PortfolioWorkspaceControls>
): PortfolioWorkspaceControls {
  const next = { ...current, ...patch };

  next.viewMode = "summary";
  next.columnMode = "essential";

  if (patch.timeWindow !== undefined && patch.customStartDate === undefined && patch.customEndDate === undefined) {
    next.customStartDate = "";
    next.customEndDate = "";
  }

  return next;
}

function getPortfolioWorkspaceSummaryDetailsOnce(
  requestKey: string,
  portfolioId: string,
  params: {
    asOfDate?: string;
    reportingCurrency?: string;
    includeProjected?: boolean;
    timeWindow: PortfolioTimeWindow;
    reportStartDate: string;
    reportEndDate: string;
    usesCustomDateRange?: boolean;
  }
) {
  const existingRequest = summaryDetailsInflightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = getPortfolioWorkspaceSummaryDetails(portfolioId, params).finally(() => {
    summaryDetailsInflightRequests.delete(requestKey);
  });
  summaryDetailsInflightRequests.set(requestKey, request);
  return request;
}

function getPortfolioWorkspaceShellOnce(portfolioId: string) {
  const existingRequest = shellInflightRequests.get(portfolioId);
  if (existingRequest) {
    return existingRequest;
  }

  const request = getPortfolioWorkspaceShell(portfolioId).finally(() => {
    shellInflightRequests.delete(portfolioId);
  });
  shellInflightRequests.set(portfolioId, request);
  return request;
}

function buildPortfolioWorkspaceSourceKey(
  selectedPortfolioId: string | null,
  initialWorkspace: PortfolioWorkspace | null,
): string {
  return JSON.stringify({
    selectedPortfolioId,
    initialWorkspace,
  });
}
