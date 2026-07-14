import { IntakeEnvelopeResponse, PortfolioBundlePayload } from "./types";
import {
  WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES,
  observeWorkbenchAnalyticsRequest,
} from "@/features/analytics-observability/metrics";

const BFF_PROXY_BASE = "/api/bff/api/v1";
const INTAKE_BUNDLE_SURFACE = WORKBENCH_ANALYTICS_UI_OBSERVED_SURFACES.find(
  (surface) => surface.operation === "intake.portfolio-bundle.ingest"
)!;

export async function ingestPortfolioBundle(
  payload: PortfolioBundlePayload,
  options: { idempotencyKey?: string } = {}
): Promise<IntakeEnvelopeResponse> {
  return await observeWorkbenchAnalyticsRequest(INTAKE_BUNDLE_SURFACE, async () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (options.idempotencyKey?.trim()) {
      headers["X-Idempotency-Key"] = options.idempotencyKey.trim();
    }

    const response = await fetch(`${BFF_PROXY_BASE}/intake/portfolio-bundle`, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: payload }),
    });

    const body = await response.text();
    let parsed: IntakeEnvelopeResponse;
    try {
      parsed = JSON.parse(body) as IntakeEnvelopeResponse;
    } catch {
      throw new Error(`Intake ingestion failed (${response.status}): ${body}`);
    }

    if (!response.ok) {
      throw new Error(`Intake ingestion failed (${response.status}): ${body}`);
    }
    return parsed;
  });
}
