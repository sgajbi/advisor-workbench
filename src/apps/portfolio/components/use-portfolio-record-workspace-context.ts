"use client";

import { useMemo } from "react";

import type { PortfolioWorkspace } from "../types";
import { buildInitialPortfolioControls, buildPortfolioWorkspaceContext } from "../view-model";

export function usePortfolioRecordWorkspaceContext(workspace: PortfolioWorkspace | null) {
  return useMemo(() => {
    if (!workspace) {
      return null;
    }

    const controls = buildInitialPortfolioControls(workspace);
    return buildPortfolioWorkspaceContext(workspace, {
      ...controls,
      viewMode: "detailed",
      columnMode: "expanded",
    });
  }, [workspace]);
}
