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
  buildPortfolioActiveFilterChips,
  buildPortfolioFilterOptions,
  buildInitialPortfolioControls,
  buildPortfolioExportPayload,
  buildPortfolioWorkspaceContext,
  derivePortfolioWorkspace,
  getPortfolioDefaultFilterValue,
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
  const initialWorkspaceSourceKey = [
    selectedPortfolioId ?? "",
    initialWorkspace?.portfolio.portfolio_id ?? "",
    initialWorkspace?.as_of_date ?? "",
    initialWorkspace?.portfolio.base_currency ?? "",
    initialWorkspace?.positions.length ?? 0,
    initialWorkspace?.recent_transactions.length ?? 0,
  ].join("|");
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceStateDraft>({
    sourceKey: initialWorkspaceSourceKey,
    workspace: initialWorkspace,
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
      if (!selectedPortfolioId || workspaceState || initialWorkspace) {
        return;
      }

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
      }
      setWorkspaceState(shellWorkspace);
    }

    void loadShellWorkspace();

    return () => {
      cancelled = true;
    };
  }, [initialWorkspace, selectedPortfolioId, setWorkspaceState, workspaceState]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaryDetails() {
      if (!selectedPortfolioId || !workspaceState) {
        return;
      }

      const request = buildPortfolioSummaryDetailsRequest(selectedPortfolioId, context);
      if (summaryRequestRef.current?.key === request.key) {
        return;
      }

      summaryRequestRef.current = { key: request.key, status: "loading" };
      const details = await getPortfolioWorkspaceSummaryDetailsOnce(
        request.key,
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
      summaryRequestRef.current = { key: request.key, status: "loaded" };
    }

    void loadSummaryDetails();

    return () => {
      cancelled = true;
    };
  }, [
    context,
    selectedPortfolioId,
    setWorkspaceState,
    workspaceState,
  ]);

  const workspace = useMemo(
    () => derivePortfolioWorkspace(workspaceState, controls),
    [controls, workspaceState]
  );
  const filterOptions = useMemo(
    () => buildPortfolioFilterOptions(workspaceState),
    [workspaceState]
  );
  const activeFilterChips = useMemo(
    () => buildPortfolioActiveFilterChips(controls),
    [controls]
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

  function handleFilterReset() {
    const defaults = buildInitialPortfolioControls(workspaceState);
    setControls((current) => ({
      ...current,
      includeCash: defaults.includeCash,
      assetClass: defaults.assetClass,
      sector: defaults.sector,
      region: defaults.region,
      positionStatus: defaults.positionStatus,
      transactionType: defaults.transactionType,
      timeWindow: defaults.timeWindow,
      customStartDate: defaults.customStartDate,
      customEndDate: defaults.customEndDate,
      showOnlyNonZeroRows: defaults.showOnlyNonZeroRows,
      showOnlyExceptions: defaults.showOnlyExceptions,
      hideEmptyModules: defaults.hideEmptyModules,
      focusExceptions: defaults.focusExceptions,
    }));
  }

  function handleFilterChipRemove(key: Parameters<typeof getPortfolioDefaultFilterValue>[0]) {
    const defaults = buildInitialPortfolioControls(workspaceState);
    setControls((current) =>
      applyPortfolioControlPatch(current, {
        [key]: getPortfolioDefaultFilterValue(key, defaults),
      } as Partial<PortfolioWorkspaceControls>)
    );
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
                filterOptions={filterOptions}
                activeFilterChips={activeFilterChips}
                onControlsChange={handleControlsChange}
                onFilterReset={handleFilterReset}
                onFilterChipRemove={handleFilterChipRemove}
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

  if (patch.showOnlyExceptions !== undefined) {
    next.focusExceptions = patch.showOnlyExceptions;
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
