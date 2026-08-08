"use client";

import { PortfolioRecordRouteError } from "@/apps/portfolio/components/portfolio-record-route-state";

export default function CashflowError({ reset }: { reset: () => void }) {
  return <PortfolioRecordRouteError screen="cashflow" reset={reset} />;
}
