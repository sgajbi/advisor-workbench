"use client";

import { PortfolioRecordRouteError } from "@/apps/portfolio/components/portfolio-record-route-state";

export default function IncomeError({ reset }: { reset: () => void }) {
  return <PortfolioRecordRouteError screen="income" reset={reset} />;
}
