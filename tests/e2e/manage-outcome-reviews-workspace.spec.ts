import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidenceDirectory = process.env.ISSUE_799_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_799_EVIDENCE_DIR, "outcome-reviews")
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

    const statusSummary = page.getByLabel("Outcome review status summary");
    await expect(statusSummary).toContainText("Review status");
    await expect(statusSummary).toContainText("Ready for adviser review");
    await expect(statusSummary).toContainText("Comparison outcome");
    await expect(statusSummary).toContainText("Within expected tolerance");
    await expect(statusSummary).toContainText("72.4%");

    const readiness = page.getByLabel("Selected outcome review readiness");
    await expect(readiness).toContainText("Review window");
    await expect(readiness).toContainText("Report preparation");
    await expect(readiness).toContainText("AI-assisted review summary");
    await expect(readiness).toContainText("Source evidence");

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
      const panel = document.querySelector<HTMLElement>(".outcome-review-panel");
      const status = document.querySelector<HTMLElement>(
        ".outcome-review-status-strip",
      );
      const readinessBand = document.querySelector<HTMLElement>(
        ".outcome-review-readiness-band",
      );
      const workspace = document.querySelector<HTMLElement>(
        ".outcome-review-workspace-grid",
      );
      const detail = document.querySelector<HTMLElement>(
        ".outcome-review-detail-panel",
      );
      if (!panel || !status || !readinessBand || !workspace || !detail) {
        throw new Error("Outcome-review workspace geometry is unavailable.");
      }
      return {
        panelTop: panel.getBoundingClientRect().top,
        panelRight: panel.getBoundingClientRect().right,
        statusRight: status.getBoundingClientRect().right,
        readinessRight: readinessBand.getBoundingClientRect().right,
        workspaceRight: workspace.getBoundingClientRect().right,
        detailRight: detail.getBoundingClientRect().right,
        statusColumns: getComputedStyle(status).gridTemplateColumns.split(" ").length,
        readinessColumns: getComputedStyle(readinessBand).gridTemplateColumns.split(" ").length,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(
      geometry.documentWidth,
      `Outcome reviews has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.statusRight).toBeLessThanOrEqual(geometry.panelRight);
    expect(geometry.readinessRight).toBeLessThanOrEqual(geometry.panelRight);
    expect(geometry.workspaceRight).toBeLessThanOrEqual(geometry.panelRight);
    expect(geometry.detailRight).toBeLessThanOrEqual(geometry.panelRight);
    if (viewport.width === 1440) {
      expect(geometry.panelTop).toBeLessThan(900);
      expect(geometry.statusColumns).toBe(2);
      expect(geometry.readinessColumns).toBe(2);
    }
    if (viewport.width === 1024 || viewport.width === 768) {
      expect(geometry.statusColumns).toBe(2);
      expect(geometry.readinessColumns).toBe(2);
    }
    if (viewport.width === 519) {
      expect(geometry.statusColumns).toBe(1);
      expect(geometry.readinessColumns).toBe(1);
    }

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

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
