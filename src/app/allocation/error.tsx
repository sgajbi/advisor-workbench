"use client";

import { PortfolioRecordRouteError } from "@/apps/portfolio/components/portfolio-record-route-state";

export default function AllocationError({ reset }: { reset: () => void }) {
  return <PortfolioRecordRouteError screen="allocation" reset={reset} />;
}
