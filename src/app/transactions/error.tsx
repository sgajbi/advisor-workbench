"use client";

import { PortfolioRecordRouteError } from "@/apps/portfolio/components/portfolio-record-route-state";

export default function TransactionsError({ reset }: { reset: () => void }) {
  return <PortfolioRecordRouteError screen="transactions" reset={reset} />;
}
