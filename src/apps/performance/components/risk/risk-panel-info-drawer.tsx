"use client";

import { useState } from "react";

import Drawer from "@mui/material/Drawer";

import { Text } from "@/design-system";

import type {
  PerformanceRiskConcentrationContextRow,
  PerformanceRiskContextRow,
} from "../../risk-workspace-view-model";
import RiskContextRows from "./risk-context-rows";

export default function RiskPanelInfoDrawer({
  panelTitle,
  rows,
  title = "Methodology & coverage",
}: {
  panelTitle: string;
  rows: Array<PerformanceRiskContextRow | PerformanceRiskConcentrationContextRow>;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!rows.length) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="performance-risk-info-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${panelTitle} methodology and coverage`}
        onClick={() => setOpen(true)}
      >
        <span className="performance-risk-info-trigger-label">{title}</span>
      </button>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          className: "performance-risk-info-drawer",
          "aria-label": `${panelTitle} methodology and coverage`,
        }}
      >
        <div className="performance-risk-info-drawer-shell">
          <div className="performance-risk-info-drawer-header">
            <Text variant="eyebrow">Context available</Text>
            <Text variant="sectionTitle">{panelTitle}</Text>
            <Text variant="secondary">
              Coverage, methodology, and supportability details for the current panel.
            </Text>
          </div>

          <div className="performance-risk-info-drawer-body">
            <RiskContextRows rows={rows} compact />
          </div>

          <div className="performance-risk-info-drawer-footer">
            <button
              type="button"
              className="performance-risk-info-dismiss"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </Drawer>
    </>
  );
}
