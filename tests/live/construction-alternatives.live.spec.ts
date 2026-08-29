import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const portfolioId = process.env.LOTUS_CANONICAL_PORTFOLIO_ID ?? "PB_SG_GLOBAL_BAL_001";
const outputDir =
  process.env.LOTUS_LIVE_EVIDENCE_DIR ??
  "output/rfc39-wtbd002-construction-lab/construction-live";

test("construction alternatives lab renders and exercises Gateway-backed generation", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await mkdir(outputDir, { recursive: true });

  await page.goto(`/workbench/${portfolioId}?mode=construction`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const panel = page.locator(".construction-alternatives-panel");
  const panelHeader = panel.getByRole("group", {
    name: "Construction Alternatives section header",
  });
  await expect(
    panel.getByRole("heading", {
      name: "Construction Alternatives",
      exact: true,
    }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    panel.getByText("Construction alternatives have not been generated")
  ).toBeVisible();
  await expect(panelHeader.getByLabel("Status Not generated")).toBeVisible();

  const responsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes("/api/bff/api/v1/dpm/command-center/construction/alternative-sets/generate"),
    { timeout: 90_000 }
  );
  await panel.getByRole("button", { name: "Generate alternatives" }).click();
  const response = await responsePromise;
  const requestBody = response.request().postDataJSON() as
    | { body?: { methods?: unknown; options_override?: unknown } }
    | null;
  const responseText = await response.text().catch(() => "");
  let responseBody: {
    correlation_id?: string;
    source_service?: string;
    supportability?: {
      state?: string;
      reason_codes?: string[];
      source_service?: string;
      authority?: string;
      selected_alternative_id?: string;
    };
    data?: {
      alternative_set_id?: string;
      alternatives?: unknown[];
      selected_alternative_id?: string;
    };
  } | null = null;
  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseBody = null;
  }

  await expect(panel.getByRole("button", { name: "Generate alternatives" })).toBeEnabled({
    timeout: 90_000,
  });
  const expectedEvidenceStatus = evidenceStatusLabel(
    responseBody?.supportability?.state,
    Array.isArray(responseBody?.data?.alternatives)
      ? responseBody.data.alternatives.length
      : 0,
  );
  await expect(panelHeader.getByLabel(`Status ${expectedEvidenceStatus}`)).toBeVisible({
    timeout: 90_000,
  });

  const panelText = await panel.innerText();
  const screenshotPath = path.join(outputDir, "construction-alternatives-live.png");
  await panel.screenshot({ path: screenshotPath });

  const evidence = {
    generatedAt: new Date().toISOString(),
    portfolioId,
    baseUrl: testInfo.project.use.baseURL,
    request: {
      method: "POST",
      path: "/api/bff/api/v1/dpm/command-center/construction/alternative-sets/generate",
      methodsSuppliedByWorkbench: requestBody?.body?.methods !== undefined,
      optionsOverrideSuppliedByWorkbench:
        requestBody?.body?.options_override !== undefined,
    },
    response: {
      status: response.status(),
      ok: response.ok(),
      body: responseBody ?? responseText,
      supportabilityState: responseBody?.supportability?.state ?? null,
      reasonCodes: responseBody?.supportability?.reason_codes ?? [],
      sourceService:
        responseBody?.supportability?.source_service ?? responseBody?.source_service ?? null,
      authority: responseBody?.supportability?.authority ?? null,
      correlationId: responseBody?.correlation_id ?? null,
      alternativeSetId: responseBody?.data?.alternative_set_id ?? null,
      alternativeCount: Array.isArray(responseBody?.data?.alternatives)
        ? responseBody.data.alternatives.length
        : 0,
      selectedAlternativeId:
        responseBody?.supportability?.selected_alternative_id ??
        responseBody?.data?.selected_alternative_id ??
        null,
    },
    ui: {
      screenshotPath,
      includesGatewaySource: panelText.includes("Gateway") || panelText.includes("LOTUS-GATEWAY"),
      includesManageAuthority: panelText.includes("lotus-manage:RFC-0039"),
      includesNoLocalMethodologyClaim: !panelText.includes("local optimizer"),
      includesBusinessAlternativeCopy:
        panelText.includes("Alternatives Comparison") ||
        panelText.includes("Recommended Path") ||
        panelText.includes("Mandate Fit"),
      evidenceStatusLabel: expectedEvidenceStatus,
      textExcerpt: panelText.slice(0, 2000),
    },
  };
  await writeFile(
    path.join(outputDir, "construction-alternatives-live-summary.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );

  expect(response.ok(), `generation response status ${response.status()}`).toBe(true);
  expect(evidence.response.sourceService).toMatch(/lotus-(gateway|manage)/i);
  expect(evidence.response.authority).toBe("lotus-manage:RFC-0039");
  expect(evidence.ui.includesGatewaySource).toBe(false);
  expect(evidence.ui.includesManageAuthority).toBe(false);
  expect(evidence.ui.includesBusinessAlternativeCopy).toBe(true);
  expect(evidence.ui.includesNoLocalMethodologyClaim).toBe(true);
  expect(evidence.request.methodsSuppliedByWorkbench).toBe(false);
  expect(evidence.request.optionsOverrideSuppliedByWorkbench).toBe(false);
});

function evidenceStatusLabel(
  sourceState: string | undefined,
  alternativeCount: number,
): string {
  const normalized = sourceState?.trim().toUpperCase() ?? "UNKNOWN";
  if (normalized === "BLOCKED") return "Blocked";
  if (normalized === "UNSUPPORTED") return "Unsupported";
  if (normalized === "DEGRADED" || normalized === "PARTIAL") {
    return alternativeCount > 0 ? "Partial evidence" : "Unavailable";
  }
  return alternativeCount > 0 ? "Evidence available" : "Unavailable";
}
