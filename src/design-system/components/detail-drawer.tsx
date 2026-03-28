"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";

export default function DetailDrawer({
  open,
  kicker,
  title,
  subtitle,
  summaryItems,
  tabs,
  fullPageHref,
  fullPageLabel,
  onClose,
}: {
  open: boolean;
  kicker: string;
  title: string;
  subtitle?: string;
  summaryItems: Array<{
    label: string;
    value: string;
  }>;
  tabs: Array<{
    key: string;
    label: string;
    content: ReactNode;
  }>;
  fullPageHref: string;
  fullPageLabel: string;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const resolvedTabs = useMemo(() => tabs.filter((tab) => Boolean(tab.content)), [tabs]);

  useEffect(() => {
    setActiveTab(0);
  }, [kicker, title, open]);

  const selectedTab = resolvedTabs[activeTab] ?? resolvedTabs[0];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: "portfolio-detail-drawer", "aria-label": `${title || "Detail"} drawer` }}
    >
      <div className="portfolio-detail-drawer-shell">
        <div className="portfolio-detail-drawer-header">
          <span className="portfolio-detail-drawer-kicker">{kicker}</span>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>

        <div className="portfolio-detail-drawer-summary">
          {summaryItems.map((item) => (
            <div key={item.label} className="portfolio-detail-drawer-summary-item">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="portfolio-detail-drawer-tabs">
          <Tabs
            value={Math.min(activeTab, Math.max(resolvedTabs.length - 1, 0))}
            onChange={(_, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons={false}
            aria-label={`${title || "Detail"} tabs`}
          >
            {resolvedTabs.map((tab) => (
              <Tab key={tab.key} label={tab.label} />
            ))}
          </Tabs>
        </div>

        <Box className="portfolio-detail-drawer-body" role="tabpanel" aria-label={selectedTab?.label ?? "Detail"}>
          {selectedTab?.content}
        </Box>

        <div className="portfolio-detail-drawer-footer">
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
          <Button component="a" href={fullPageHref} variant="contained">
            {fullPageLabel}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
