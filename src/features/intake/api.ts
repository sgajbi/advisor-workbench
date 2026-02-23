import { IntakeEnvelopeResponse, PortfolioBundlePayload } from "./types";

const BFF_PROXY_BASE = "/api/bff/api/v1";

export async function ingestPortfolioBundle(
  payload: PortfolioBundlePayload
): Promise<IntakeEnvelopeResponse> {
  const response = await fetch(`${BFF_PROXY_BASE}/intake/portfolio-bundle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
}
