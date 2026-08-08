"use client";

import { PortfolioRecordRouteError } from "@/apps/portfolio/components/portfolio-record-route-state";

export default function PositionsError({ reset }: { reset: () => void }) {
  return <PortfolioRecordRouteError screen="positions" reset={reset} />;
}
