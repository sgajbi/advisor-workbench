"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  WorkbenchToolbarPlaceholder,
} from "@/design-system";

import {
  getPortfolioWorkspaceShell,
  getPortfolioWorkspaceSummaryDetails,
  mergePortfolioWorkspace,
} from "../api";
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
  const [workspaceState, setWorkspaceState] = useState<PortfolioWorkspace | null>(initialWorkspace);
  const [, setShellLoading] = useState<boolean>(
    Boolean(selectedPortfolioId && !initialWorkspace)
  );
  const [, setSummaryDetailsLoading] = useState<boolean>(
    Boolean(selectedPortfolioId && initialWorkspace)
  );
  const [interactiveReady, setInteractiveReady] = useState(false);
  const summaryRequestRef = useRef<{ key: string; status: "loading" | "loaded" } | null>(null);
  const context = useMemo(
    () => buildPortfolioWorkspaceContext(workspaceState, controls),
    [controls, workspaceState]
  );

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  useEffect(() => {
    setWorkspaceState(initialWorkspace);
    setShellLoading(Boolean(selectedPortfolioId && !initialWorkspace));
    setSummaryDetailsLoading(Boolean(initialWorkspace && selectedPortfolioId));
    summaryRequestRef.current = null;
  }, [initialWorkspace, selectedPortfolioId]);

  useEffect(() => {
    let cancelled = false;

    async function loadShellWorkspace() {
      if (!selectedPortfolioId || workspaceState || initialWorkspace) {
        setShellLoading(false);
        return;
      }

      setShellLoading(true);
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
      setShellLoading(false);
    }

    void loadShellWorkspace();

    return () => {
      cancelled = true;
    };
  }, [initialWorkspace, selectedPortfolioId, workspaceState]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaryDetails() {
      if (!selectedPortfolioId || !workspaceState) {
        setSummaryDetailsLoading(false);
        return;
      }

      const requestKey = `${selectedPortfolioId}:${context.selectedAsOfDate}:${context.selectedReportingCurrency}:${context.timeWindow}:${context.effectivePeriodStartDate}:${context.effectivePeriodEndDate}:${context.usesCustomDateRange}`;
      if (summaryRequestRef.current?.key === requestKey) {
        return;
      }

      summaryRequestRef.current = { key: requestKey, status: "loading" };
      setSummaryDetailsLoading(true);
      const details = await getPortfolioWorkspaceSummaryDetailsOnce(requestKey, selectedPortfolioId, {
        asOfDate: context.selectedAsOfDate,
        reportingCurrency: context.selectedReportingCurrency,
        includeProjected: false,
        timeWindow: context.timeWindow,
        reportStartDate: context.effectivePeriodStartDate,
        reportEndDate: context.effectivePeriodEndDate,
        usesCustomDateRange: context.usesCustomDateRange,
      });
      if (cancelled) {
        return;
      }

      if (details) {
        setWorkspaceState((current) =>
          current ? mergePortfolioWorkspace(current, details) : current
        );
      }
      summaryRequestRef.current = { key: requestKey, status: "loaded" };
      setSummaryDetailsLoading(false);
    }

    void loadSummaryDetails();

    return () => {
      cancelled = true;
    };
  }, [
    context.effectivePeriodEndDate,
    context.effectivePeriodStartDate,
    context.selectedAsOfDate,
    context.selectedReportingCurrency,
    context.timeWindow,
    context.usesCustomDateRange,
    selectedPortfolioId,
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
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
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
