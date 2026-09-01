import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  getPmQualityFixtureScoreRuns,
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";
import { assertExactSourceRenderProof } from "../../scripts/live/validation/source-render-proof.mjs";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = process.env.ISSUE_976_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_976_EVIDENCE_DIR, "pm-operating-quality")
  : null;
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "pm-quality") return;
  const port = Number(process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "manage"
  ) {
    throw new Error(`Manage fixture proof requires the owned gateway at ${expectedGateway}.`);
  }
  fixtureGateway = await startManageFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("PM Operating Quality keeps supervisory evidence dense, source-backed, and keyboard reachable", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);
  const runtime = observeBrowserRuntimeFailures(page);

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 519, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/workbench/${portfolioId}?mode=quality`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const panel = page.locator("article#pm-operating-quality-panel");
    await expect(
      panel.getByRole("heading", { name: "PM Operating Quality", exact: true }),
    ).toBeVisible({ timeout: 60_000 });

    const sourceEvidence = panel.getByTestId("pm-operating-quality-source-evidence");
    await expect(sourceEvidence).toHaveAttribute("data-source-service", "lotus-manage");
    await expect(sourceEvidence).toHaveAttribute(
      "data-authority",
      "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    );
    await expect(sourceEvidence).toHaveAttribute("data-score-run-id", "pmq_run_001");
    await expect(sourceEvidence).toHaveAttribute("data-score-run-state", "READY");
    await expect(panel.getByText("Balanced DPM Mandates", { exact: true })).toBeVisible();
    await expect(panel.getByText("No portfolio-manager quality runs were returned")).toHaveCount(0);

    const scoreRuns = panel.getByRole("listbox", {
      name: "PM operating quality score-run selection",
    });
    const expectedScoreRuns = getPmQualityFixtureScoreRuns().map((scoreRun) => ({
      source: "lotus-manage",
      identity: scoreRun.score_run_id,
      state: scoreRun.state,
    }));
    const renderedScoreRuns = scoreRuns.locator("[data-source-render-row]");
    await expect(renderedScoreRuns).toHaveCount(expectedScoreRuns.length);
    assertExactSourceRenderProof({
      screen: "PM Operating Quality",
      expectedRows: expectedScoreRuns,
      renderedRows: await renderedScoreRuns.evaluateAll((elements) =>
        elements.map((element) => ({
          source: element.getAttribute("data-source") ?? "",
          identity: element.getAttribute("data-source-identity") ?? "",
          state: element.getAttribute("data-source-state") ?? "",
        })),
      ),
    });
    const selectedRun = scoreRuns.getByRole("option", {
      name: /PM_SG_001 \/ PM_BOOK_SG_BALANCED/,
    });
    await expect(selectedRun).toHaveAttribute("aria-selected", "true");
    await selectedRun.focus();
    await expect(selectedRun).toBeFocused();

    const geometry = await page.evaluate(() => {
      const source = document.querySelector<HTMLElement>(
        '[data-testid="pm-operating-quality-source-evidence"]',
      );
      const workspace = document.querySelector<HTMLElement>(
        '[data-testid="pm-operating-quality-workspace"]',
      );
      if (!source || !workspace) {
        throw new Error("PM Operating Quality geometry is unavailable.");
      }
      return {
        sourceColumns: getComputedStyle(source).gridTemplateColumns.split(" ").length,
        workspaceColumns: getComputedStyle(workspace).gridTemplateColumns.split(" ").length,
      };
    });
    expect(geometry.sourceColumns).toBeGreaterThanOrEqual(1);
    expect(geometry.workspaceColumns).toBe(1);

    if (viewport.width > 1200) {
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
        "Wide-screen supervisory evidence should keep later decisions above excessive table wrap.",
      ).toBeLessThan(7000);
    }

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      overflow.documentWidth,
      `PM Operating Quality has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(overflow.clientWidth);

    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `pm-operating-quality-${viewport.width}.png`),
        fullPage: true,
      });
    }
    await testInfo.attach(`pm-operating-quality-${viewport.width}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
