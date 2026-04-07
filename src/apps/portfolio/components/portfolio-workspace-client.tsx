"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  AppPageShell,
  WorkbenchLoadingState,
  WorkbenchToolbarPlaceholder,
} from "@/design-system";

import {
  getPortfolioWorkspaceDetailedDetails,
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
import PortfolioWorkspaceToolbar from "./portfolio-workspace-toolbar";
import PortfolioWorkspaceView from "./portfolio-workspace";

const PORTFOLIO_VIEW_MODE_STORAGE_KEY = "lotus:portfolio:view-mode";
const summaryDetailsInflightRequests = new Map<
  string,
  ReturnType<typeof getPortfolioWorkspaceSummaryDetails>
>();
const detailedDetailsInflightRequests = new Map<
  string,
  ReturnType<typeof getPortfolioWorkspaceDetailedDetails>
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
  const [summaryDetailsLoading, setSummaryDetailsLoading] = useState<boolean>(Boolean(selectedPortfolioId));
  const [detailedDetailsLoaded, setDetailedDetailsLoaded] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const summaryRequestRef = useRef<{ key: string; status: "loading" | "loaded" } | null>(null);
  const detailedRequestRef = useRef<{ key: string; status: "loading" | "loaded" } | null>(null);
  const context = useMemo(
    () => buildPortfolioWorkspaceContext(workspaceState, controls),
    [controls, workspaceState]
  );

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  useEffect(() => {
    const storedViewMode = window.localStorage.getItem(PORTFOLIO_VIEW_MODE_STORAGE_KEY);
    if (storedViewMode !== "summary" && storedViewMode !== "detailed") {
      return;
    }

    setControls((current) => applyPortfolioControlPatch(current, { viewMode: storedViewMode }));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PORTFOLIO_VIEW_MODE_STORAGE_KEY, controls.viewMode);
  }, [controls.viewMode]);

  useEffect(() => {
    setWorkspaceState(initialWorkspace);
    setSummaryDetailsLoading(Boolean(initialWorkspace && selectedPortfolioId));
    setDetailedDetailsLoaded(false);
    summaryRequestRef.current = null;
    detailedRequestRef.current = null;
  }, [initialWorkspace, selectedPortfolioId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaryDetails() {
      if (!selectedPortfolioId || !initialWorkspace) {
        setSummaryDetailsLoading(false);
        return;
      }

      const requestKey = `${selectedPortfolioId}:${initialWorkspace.as_of_date}:${context.timeWindow}:${context.effectivePeriodStartDate}:${context.effectivePeriodEndDate}:${context.usesCustomDateRange}`;
      if (summaryRequestRef.current?.key === requestKey) {
        return;
      }

      summaryRequestRef.current = { key: requestKey, status: "loading" };
      setSummaryDetailsLoading(true);
      const details = await getPortfolioWorkspaceSummaryDetailsOnce(requestKey, selectedPortfolioId, {
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
    context.timeWindow,
    context.usesCustomDateRange,
    initialWorkspace,
    selectedPortfolioId,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetailedDetails() {
      if (!selectedPortfolioId || !workspaceState || controls.viewMode !== "detailed") {
        return;
      }

      const requestKey = `${selectedPortfolioId}:${workspaceState.as_of_date}`;
      const transactionWindowKey = `${context.effectivePeriodStartDate}:${context.effectivePeriodEndDate}`;
      const scopedRequestKey = `${requestKey}:${transactionWindowKey}`;
      if (
        detailedRequestRef.current?.key === scopedRequestKey &&
        detailedRequestRef.current?.status === "loaded"
      ) {
        return;
      }

      detailedRequestRef.current = { key: scopedRequestKey, status: "loading" };
      setDetailedDetailsLoaded(false);
      const details = await getPortfolioWorkspaceDetailedDetailsOnce(scopedRequestKey, selectedPortfolioId, {
        asOfDate: context.selectedAsOfDate,
        startDate: context.effectivePeriodStartDate,
        endDate: context.effectivePeriodEndDate,
      });
      if (cancelled || !details) {
        return;
      }

      setWorkspaceState((current) =>
        current ? mergePortfolioWorkspace(current, details) : current
      );
      detailedRequestRef.current = { key: scopedRequestKey, status: "loaded" };
      setDetailedDetailsLoaded(true);
    }

    void loadDetailedDetails();

    return () => {
      cancelled = true;
    };
  }, [
    context.effectivePeriodEndDate,
    context.effectivePeriodStartDate,
    context.selectedAsOfDate,
    controls.viewMode,
    detailedDetailsLoaded,
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
    <AppPageShell pageKey="portfolio" className="portfolio-page">
      {!portfolios.length ? (
        <PortfolioUnavailableWorkspace />
      ) : (
        <PortfolioWorkspaceView
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          workspace={workspace}
          context={context}
          detailsLoading={
            summaryDetailsLoading ||
            (controls.viewMode === "detailed" && !detailedDetailsLoaded)
          }
          toolbar={
            !interactiveReady ? (
              <div className="workbench-toolbar-placeholder-stack">
                <WorkbenchToolbarPlaceholder
                  className="portfolio-workspace-toolbar"
                  contextMessage="Loading portfolio controls…"
                  fields={[
                    { key: "as-of", label: "As of" },
                    { key: "reporting-currency", label: "Reporting Currency" },
                    { key: "view", label: "View", width: "wide" },
                    { key: "period", label: "Period", width: "period" },
                  ]}
                />
                <WorkbenchLoadingState
                  title="Loading portfolio briefing"
                  message="Portfolio modules are loading for the selected book."
                  chart
                  rows={6}
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
    </AppPageShell>
  );
}

function applyPortfolioControlPatch(
  current: PortfolioWorkspaceControls,
  patch: Partial<PortfolioWorkspaceControls>
): PortfolioWorkspaceControls {
  const next = { ...current, ...patch };

  if (patch.viewMode === "summary") {
    next.columnMode = "essential";
    next.customStartDate = "";
    next.customEndDate = "";
  }

  if (patch.viewMode === "detailed" && patch.columnMode === undefined) {
    next.columnMode = "expanded";
  }

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

function getPortfolioWorkspaceDetailedDetailsOnce(
  requestKey: string,
  portfolioId: string,
  params: {
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const existingRequest = detailedDetailsInflightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = getPortfolioWorkspaceDetailedDetails(portfolioId, params).finally(() => {
    detailedDetailsInflightRequests.delete(requestKey);
  });
  detailedDetailsInflightRequests.set(requestKey, request);
  return request;
}
