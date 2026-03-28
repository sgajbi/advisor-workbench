"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusChip, WorkspaceHeader } from "@/design-system";

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
  type PortfolioWorkspaceControls,
} from "../view-model";
import PortfolioUnavailableWorkspace from "./portfolio-unavailable-workspace";
import PortfolioWorkspaceToolbar from "./portfolio-workspace-toolbar";
import PortfolioWorkspaceView from "./portfolio-workspace";

const PORTFOLIO_VIEW_MODE_STORAGE_KEY = "lotus:portfolio:view-mode";

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
  }, [initialWorkspace, selectedPortfolioId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummaryDetails() {
      if (!selectedPortfolioId || !initialWorkspace) {
        setSummaryDetailsLoading(false);
        return;
      }

      setSummaryDetailsLoading(true);
      const details = await getPortfolioWorkspaceSummaryDetails(selectedPortfolioId);
      if (cancelled) {
        return;
      }

      if (details) {
        setWorkspaceState((current) =>
          current ? mergePortfolioWorkspace(current, details) : current
        );
      }
      setSummaryDetailsLoading(false);
    }

    void loadSummaryDetails();

    return () => {
      cancelled = true;
    };
  }, [initialWorkspace, selectedPortfolioId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetailedDetails() {
      if (
        !selectedPortfolioId ||
        !workspaceState ||
        controls.viewMode !== "detailed" ||
        detailedDetailsLoaded
      ) {
        return;
      }

      const details = await getPortfolioWorkspaceDetailedDetails(selectedPortfolioId);
      if (cancelled || !details) {
        return;
      }

      setWorkspaceState((current) =>
        current ? mergePortfolioWorkspace(current, details) : current
      );
      setDetailedDetailsLoaded(true);
    }

    void loadDetailedDetails();

    return () => {
      cancelled = true;
    };
  }, [controls.viewMode, detailedDetailsLoaded, selectedPortfolioId, workspaceState]);

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
  const context = useMemo(
    () => buildPortfolioWorkspaceContext(workspaceState, controls),
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
    <main className="page-container">
      <WorkspaceHeader
        title="Portfolio"
        meta={
          <>
            <StatusChip>{portfolios.length} portfolios</StatusChip>
            <StatusChip tone={portfolios.length ? "success" : "warn"}>
              {portfolios.length ? "Catalog live" : "Catalog unavailable"}
            </StatusChip>
          </>
        }
      />

      {portfolios.length ? (
        <PortfolioWorkspaceToolbar
          controls={controls}
          context={context}
          filterOptions={filterOptions}
          activeFilterChips={activeFilterChips}
          onControlsChange={handleControlsChange}
          onFilterReset={handleFilterReset}
          onFilterChipRemove={handleFilterChipRemove}
          onExport={handleExport}
          quickActions={initialWorkspace?.workflow_cues ?? []}
        />
      ) : null}

      {!portfolios.length ? (
        <PortfolioUnavailableWorkspace />
      ) : (
        <PortfolioWorkspaceView
          portfolios={portfolios}
          selectedPortfolioId={selectedPortfolioId}
          workspace={workspace}
          context={context}
          detailsLoading={summaryDetailsLoading}
        />
      )}
    </main>
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
