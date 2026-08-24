"use client";

import type { ReactNode } from "react";

export type PortfolioDetailDrawerState = {
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
  fullPageHref?: string;
  fullPageLabel?: string;
};

export type PortfolioMetricDrawerKey =
  | "portfolio_value"
  | "invested_assets"
  | "available_cash";
