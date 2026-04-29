import { NextResponse } from "next/server";

import { renderAnalyticsUiPrometheusMetrics } from "@/features/analytics-observability/metrics";

export async function GET() {
  return new NextResponse(renderAnalyticsUiPrometheusMetrics(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
