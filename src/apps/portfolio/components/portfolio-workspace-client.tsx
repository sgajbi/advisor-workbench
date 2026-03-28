"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusChip, WorkspaceHeader } from "@/design-system";

import { getPortfolioWorkspaceDetails, mergePortfolioWorkspace } from "../api";
import type { PortfolioCatalogResponse, PortfolioWorkspace } from "../types";
import {
  buildInitialPortfolioControls,
  buildPortfolioExportPayload,
  buildPortfolioWorkspaceContext,
  derivePortfolioWorkspace,
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
  const [detailsLoading, setDetailsLoading] = useState<boolean>(Boolean(selectedPortfolioId));

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
  }, [initialWorkspace]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      if (!selectedPortfolioId || !initialWorkspace) {
        setDetailsLoading(false);
        return;
      }

      setDetailsLoading(true);
      const details = await getPortfolioWorkspaceDetails(selectedPortfolioId);
      if (cancelled) {
        return;
      }

      if (details) {
        setWorkspaceState((current) =>
          current ? mergePortfolioWorkspace(current, details) : current
        );
      }
      setDetailsLoading(false);
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [initialWorkspace, selectedPortfolioId]);

  const workspace = useMemo(
    () => derivePortfolioWorkspace(workspaceState, controls),
    [controls, workspaceState]
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
          onControlsChange={handleControlsChange}
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
          detailsLoading={detailsLoading}
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
  }

  if (patch.viewMode === "detailed" && patch.columnMode === undefined) {
    next.columnMode = "expanded";
  }

  return next;
}
