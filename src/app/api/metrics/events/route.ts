import { NextResponse } from "next/server";

import { recordAnalyticsUiExternalMetricEvent } from "@/features/analytics-observability/metrics";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ status: "rejected" }, { status: 400 });
  }

  try {
    recordAnalyticsUiExternalMetricEvent(payload);
  } catch {
    return NextResponse.json({ status: "rejected" }, { status: 400 });
  }

  return NextResponse.json({ status: "accepted" }, { status: 202 });
}
