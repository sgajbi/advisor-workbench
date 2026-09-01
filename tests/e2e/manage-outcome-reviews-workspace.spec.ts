import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = process.env.OUTCOME_REVIEW_EVIDENCE_DIR
  ? path.resolve(process.env.OUTCOME_REVIEW_EVIDENCE_DIR, "outcome-reviews")
  : null;
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "outcome-reviews") {
    return;
  }
  const port = Number(process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "manage"
  ) {
    throw new Error(
      `Outcome-review proof requires the owned Manage fixture at ${expectedGateway}.`,
    );
  }
  fixtureGateway = await startManageFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("Outcome reviews keeps comparison truth, evidence, and next actions distinct", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);
  const runtime = observeBrowserRuntimeFailures(page);
  const measurements: Array<Record<string, number>> = [];

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 519, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/workbench/${portfolioId}?mode=reviews`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    const screenHeading = page.getByRole("heading", {
      name: "Outcome reviews",
      exact: true,
    });
    await expect(screenHeading).toBeVisible({ timeout: 60_000 });
    await expect(screenHeading).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Outcome comparison", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("review-context-strip")).toHaveAttribute(
      "data-source-state",
      "confirmed",
    );

    const decisionSummary = page.getByLabel("Outcome review decision summary");
    await expect(decisionSummary).toContainText("Review status");
    await expect(decisionSummary).toContainText("Ready for adviser review");
    await expect(decisionSummary).toContainText("Comparison outcome");
    await expect(decisionSummary).toContainText("Within expected tolerance");
    await expect(decisionSummary).toContainText("72.4%");
    await expect(decisionSummary).not.toContainText("Evidence pack");
    await expect(page.getByLabel("Selected outcome review readiness")).toHaveCount(0);

    const evidenceAvailability = page.getByLabel(
      "Outcome review evidence availability",
    );
    await expect(evidenceAvailability).toContainText(
      "Expected outcome Available",
    );
    await expect(evidenceAvailability).toContainText(
      "Realised outcome Available",
    );

    await expect(
      page.getByRole("heading", { name: "Recommended actions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Selected review detail" }),
    ).toBeVisible();
    await expect(
      page.getByRole("table", { name: "Outcome review dimensions" }),
    ).toContainText("Realised outcome");
    await expect(page.getByLabel("Client communication boundary")).toContainText(
      "Client communication and approval remain in the owning client-communication workflow.",
    );
    const blockedClientActions = page.getByText("View blocked client actions", {
      exact: true,
    });
    await expect(blockedClientActions).toBeVisible();
    await expect(page.getByText("Client message generation", { exact: true })).toBeHidden();
    await blockedClientActions.click();
    await expect(page.getByText("Client message generation", { exact: true })).toBeVisible();
    await blockedClientActions.click();
    const prepareSummary = page.getByRole("button", {
      name: /Prepare AI-assisted review summary/,
    });
    await expect(prepareSummary).toHaveCount(1);
    if (viewport.width === 1440) {
      await prepareSummary.focus();
      await expect(prepareSummary).toBeFocused();
      await prepareSummary.press("Enter");
      const narrativeHeading = page.getByRole("heading", {
        name: "Outcome review narrative",
      });
      await expect(narrativeHeading).toBeVisible();
      await expect(narrativeHeading).toBeFocused();
      await expect(
        page.getByLabel("Status Live output • review required"),
      ).toBeVisible();
    }

    const sourceProfile = page.getByText("View source profile", { exact: true });
    await expect(sourceProfile).toBeVisible();
    await expect(page.getByText("Performance analytics", { exact: true })).toBeHidden();
    await sourceProfile.click();
    await expect(page.getByText("Performance analytics", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Performance result", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Review order: Source-ranked", { exact: true })).toBeVisible();
    await sourceProfile.click();
    await expect(page.getByText("Performance analytics", { exact: true })).toBeHidden();

    await expect(page.getByText("Within Mandate", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Latest Review", { exact: true })).toHaveCount(0);
    await expect(page.getByText("AI Narrative", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Gateway", { exact: true })).toHaveCount(0);
    await expect(page.getByText("READY_WITHIN_TOLERANCE", { exact: true })).toHaveCount(0);
    await expect(page.getByText("CREATE_REPORT_INPUT", { exact: true })).toHaveCount(0);
    await expect(page.getByText("ClientCommunicationRecord:v1", { exact: true })).toHaveCount(0);
    await expect(page.getByText("outcome_review", { exact: true })).toHaveCount(0);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0);
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>("#outcome-review-panel");
      const decision = document.querySelector<HTMLElement>(
        '[aria-label="Outcome review decision summary"]',
      );
      const timeline = document.querySelector<HTMLElement>(
        '[role="region"][aria-label="Outcome review timeline"]',
      );
      const detail = document.querySelector<HTMLElement>(
        '[data-testid="selected-outcome-review-detail"]',
      );
      if (!panel || !decision || !timeline || !detail) {
        throw new Error("Outcome-review workspace geometry is unavailable.");
      }
      return {
        panelTop: panel.getBoundingClientRect().top,
        panelRight: panel.getBoundingClientRect().right,
        decisionTop: decision.getBoundingClientRect().top,
        decisionRight: decision.getBoundingClientRect().right,
        timelineTop: timeline.getBoundingClientRect().top,
        timelineRight: timeline.getBoundingClientRect().right,
        detailTop: detail.getBoundingClientRect().top,
        detailRight: detail.getBoundingClientRect().right,
        documentHeight: document.documentElement.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(
      geometry.documentWidth,
      `Outcome reviews has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.decisionRight).toBeLessThanOrEqual(geometry.panelRight);
    expect(geometry.timelineRight).toBeLessThanOrEqual(geometry.panelRight);
    expect(geometry.detailRight).toBeLessThanOrEqual(geometry.panelRight);
    expect(geometry.decisionTop).toBeLessThan(geometry.timelineTop);
    expect(geometry.timelineTop).toBeLessThan(geometry.detailTop);
    if (viewport.width === 1440) {
      expect(geometry.panelTop).toBeLessThan(900);
    }
    measurements.push({ width: viewport.width, height: viewport.height, ...geometry });

    await page.mouse.move(0, 0);
    const screenshot = await page.screenshot({ fullPage: true });
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(
          evidenceDirectory,
          `outcome-reviews-${viewport.width}.png`,
        ),
        fullPage: true,
      });
    }
    await testInfo.attach(`outcome-reviews-${viewport.width}`, {
      body: screenshot,
      contentType: "image/png",
    });
  }

  if (evidenceDirectory) {
    await writeFile(
      path.join(evidenceDirectory, "rendered-measurements.json"),
      `${JSON.stringify(measurements, null, 2)}\n`,
      "utf8",
    );
  }

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
