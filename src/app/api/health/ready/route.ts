import { NextResponse } from "next/server";

import { assessWorkbenchReadiness } from "@/features/platform-runtime/workbench-health";

export const dynamic = "force-dynamic";

export function GET() {
  const readiness = assessWorkbenchReadiness();
  return NextResponse.json(readiness, {
    status: readiness.status === "ready" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
