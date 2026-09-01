import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import {
  manageProofPackFixtureIds,
  startManageFixtureGateway,
  type ManageFixtureGateway,
} from "./manage-fixture-gateway";

test.describe.configure({ mode: "serial" });

const portfolioId = "PB_SG_GLOBAL_BAL_001";
const evidencePackDirectory = process.env.ISSUE_981_EVIDENCE_DIR
  ? path.resolve(process.env.ISSUE_981_EVIDENCE_DIR, "evidence-pack")
  : null;
const proofCopilotEvidenceRoot =
  process.env.ISSUE_983_EVIDENCE_DIR ??
  process.env.ISSUE_967_EVIDENCE_DIR ??
  process.env.ISSUE_861_EVIDENCE_DIR;
const proofCopilotEvidenceDirectory = proofCopilotEvidenceRoot
  ? path.resolve(proofCopilotEvidenceRoot, "proof-copilot")
  : null;
const evidencePhase = process.env.PROOF_PACK_EVIDENCE_PHASE === "before" ? "before" : "after";
let fixtureGateway: ManageFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.MANAGE_E2E_FIXTURE !== "proof-copilot") {
    return;
  }
  const port = Number(process.env.MANAGE_E2E_FIXTURE_PORT ?? "18150");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "manage"
  ) {
    throw new Error(
      `Evidence-to-Copilot proof requires the owned Manage fixture at ${expectedGateway}.`,
    );
  }
  fixtureGateway = await startManageFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("PM Copilot follows the source-confirmed evidence pack across Manage modes", async ({
  page,
}, testInfo) => {
  test.skip(!fixtureGateway, "Owned Manage fixture is not active.");
  test.setTimeout(180_000);
  const runtime = observeBrowserRuntimeFailures(page);
  const unavailableMeasurements: Array<Record<string, number>> = [];
  const readyMeasurements: Array<Record<string, number>> = [];
  const copilotMeasurements: Array<Record<string, number>> = [];

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 721, height: 900 },
    { width: 561, height: 900 },
    { width: 519, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`/workbench/${portfolioId}?mode=proof`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await expect(
      page.getByRole("heading", { name: "Evidence Pack", level: 1 }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Evidence pack is unavailable", { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Evidence areas" })).toHaveCount(0);
    await expect(page.getByLabel("Evidence pack next actions")).toHaveCount(0);

    const unavailableGeometry = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>("#evidence-pack-panel");
      const summary = document.querySelector<HTMLElement>(
        '[aria-label="Evidence pack decision summary"]',
      );
      if (!panel || !summary) {
        throw new Error("Unavailable Evidence Pack geometry is unavailable.");
      }
      return {
        panelTop: panel.getBoundingClientRect().top,
        panelRight: panel.getBoundingClientRect().right,
        summaryTop: summary.getBoundingClientRect().top,
        summaryRight: summary.getBoundingClientRect().right,
        documentHeight: document.documentElement.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(unavailableGeometry.documentWidth).toBeLessThanOrEqual(
      unavailableGeometry.clientWidth,
    );
    expect(unavailableGeometry.summaryRight).toBeLessThanOrEqual(
      unavailableGeometry.panelRight,
    );
    unavailableMeasurements.push({
      width: viewport.width,
      height: viewport.height,
      ...unavailableGeometry,
    });

    if (evidencePackDirectory) {
      await mkdir(evidencePackDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(
          evidencePackDirectory,
          `evidence-pack-unavailable-${evidencePhase}-${viewport.width}.png`,
        ),
        fullPage: true,
      });
    }

    await page.getByRole("button", { name: "Load evidence", exact: true }).click();
    await expect(page.getByText("Evidence pack loaded.", { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Evidence areas" })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0);

    const readyGeometry = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>("#evidence-pack-panel");
      const summary = document.querySelector<HTMLElement>(
        '[aria-label="Evidence pack decision summary"]',
      );
      const table = document
        .querySelector<HTMLElement>('table[aria-label="Evidence areas"]')
        ?.closest<HTMLElement>(".analytics-table-frame");
      const nextActions = document.querySelector<HTMLElement>(
        '[aria-label="Evidence pack next actions"]',
      );
      const detail = document.querySelector<HTMLElement>(
        '[data-testid="evidence-pack-detail"]',
      );
      if (!panel || !summary || !table || !nextActions || !detail) {
        throw new Error("Evidence Pack workspace geometry is unavailable.");
      }
      return {
        panelTop: panel.getBoundingClientRect().top,
        panelRight: panel.getBoundingClientRect().right,
        summaryTop: summary.getBoundingClientRect().top,
        summaryRight: summary.getBoundingClientRect().right,
        tableTop: table.getBoundingClientRect().top,
        tableRight: table.getBoundingClientRect().right,
        nextActionsTop: nextActions.getBoundingClientRect().top,
        nextActionsRight: nextActions.getBoundingClientRect().right,
        detailTop: detail.getBoundingClientRect().top,
        detailRight: detail.getBoundingClientRect().right,
        documentHeight: document.documentElement.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(
      readyGeometry.documentWidth,
      `Evidence Pack has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(readyGeometry.clientWidth);
    expect(readyGeometry.summaryRight).toBeLessThanOrEqual(readyGeometry.panelRight);
    expect(readyGeometry.tableRight).toBeLessThanOrEqual(readyGeometry.panelRight);
    expect(readyGeometry.nextActionsRight).toBeLessThanOrEqual(readyGeometry.panelRight);
    expect(readyGeometry.detailRight).toBeLessThanOrEqual(readyGeometry.panelRight);
    expect(readyGeometry.summaryTop).toBeLessThan(readyGeometry.tableTop);
    expect(readyGeometry.tableTop).toBeLessThan(readyGeometry.detailTop);
    readyMeasurements.push({
      width: viewport.width,
      height: viewport.height,
      ...readyGeometry,
    });

    if (evidencePackDirectory) {
      await mkdir(evidencePackDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(
          evidencePackDirectory,
          `evidence-pack-ready-${evidencePhase}-${viewport.width}.png`,
        ),
        fullPage: true,
      });
    }
  }

  if (evidencePackDirectory) {
    await writeFile(
      path.join(
        evidencePackDirectory,
        `rendered-measurements-unavailable-${evidencePhase}.json`,
      ),
      `${JSON.stringify(unavailableMeasurements, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(
        evidencePackDirectory,
        `rendered-measurements-ready-${evidencePhase}.json`,
      ),
      `${JSON.stringify(readyMeasurements, null, 2)}\n`,
      "utf8",
    );
  }

  await expect(page.getByLabel("Evidence pack lifecycle actions")).toBeVisible();
  await expect(page.getByLabel("Evidence pack next actions")).toBeVisible();
  await expect(page.getByRole("button", { name: "Prepare evidence" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Load evidence", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Load evidence summary/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Check report readiness/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /^Open advisor memo/ })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Generate client report/ })).toHaveCount(0);
  expect(fixtureGateway?.getLastLoadedProofPackId()).toBe(manageProofPackFixtureIds.initial);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Prepare evidence" }).click();
  await expect(page.getByText("Evidence pack prepared.", { exact: true })).toBeVisible();

  const copilotLink = page.getByRole("link", { name: /Copilot/ });
  if ((await copilotLink.count()) === 0) {
    await page.getByRole("button", { name: /Change workflow step/ }).click();
  }
  await copilotLink.click();
  await expect(
    page.getByRole("heading", { name: "PM Copilot", level: 1 }),
  ).toBeVisible();
  const selectedWorkflow = page.getByTestId("pm-copilot-selected-workflow");
  await expect(
    selectedWorkflow.getByText(manageProofPackFixtureIds.published, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(manageProofPackFixtureIds.initial, { exact: true })).toHaveCount(0);

  const prepareMemo = page.getByRole("button", {
    name: "Prepare Evidence Pack Decision Memo",
  });
  await expect(prepareMemo).toBeEnabled();
  await prepareMemo.click();
  await expect(
    page.getByRole("heading", { name: "Portfolio decision memo" }),
  ).toBeVisible();
  expect(fixtureGateway?.getLastProofPackMemoId()).toBe(manageProofPackFixtureIds.published);

  const preparationDisclosure = page.locator("summary").filter({
    hasText: "How this was prepared",
  });
  await preparationDisclosure.focus();
  await expect(preparationDisclosure).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(preparationDisclosure.locator("..")).toHaveAttribute("open", "");
  const latestResult = page.getByLabel("Latest decision-support result");
  await expect(latestResult.getByText("Human review required", { exact: true })).toBeVisible();
  await expect(latestResult.getByText("Internal working use only", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 519, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(prepareMemo).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    const geometry = await page.evaluate(() => {
      const workspace = document.querySelector<HTMLElement>("#pm-copilot-workspace");
      const worklist = document.querySelector<HTMLElement>(
        "#pm-copilot-workspace [data-workbench-record-selector]",
      );
      const decision = document.querySelector<HTMLElement>(
        '#pm-copilot-workspace [data-testid="pm-copilot-selected-workflow"]',
      );
      const action = document.querySelector<HTMLElement>(
        '#pm-copilot-workspace button[aria-label="Prepare Evidence Pack Decision Memo"]',
      );
      const result = document.querySelector<HTMLElement>(
        '#pm-copilot-workspace [aria-label="Latest decision-support result"]',
      );
      if (!workspace || !worklist || !decision || !action || !result) {
        throw new Error("PM Copilot decision-worklist geometry is unavailable.");
      }
      const absoluteTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top + window.scrollY;
      return {
        workspaceTop: absoluteTop(workspace),
        workspaceRight: workspace.getBoundingClientRect().right,
        worklistTop: absoluteTop(worklist),
        worklistLeft: worklist.getBoundingClientRect().left,
        worklistRight: worklist.getBoundingClientRect().right,
        decisionTop: absoluteTop(decision),
        decisionLeft: decision.getBoundingClientRect().left,
        decisionRight: decision.getBoundingClientRect().right,
        primaryActionTop: absoluteTop(action),
        resultTop: absoluteTop(result),
        documentHeight: document.documentElement.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        workflowCount: document.querySelectorAll(
          '#pm-copilot-workspace [role="option"]',
        ).length,
        prepareActionCount: document.querySelectorAll(
          '#pm-copilot-workspace button[aria-label^="Prepare "]',
        ).length,
      };
    });
    expect(
      geometry.documentWidth,
      `PM Copilot has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.worklistRight).toBeLessThanOrEqual(geometry.workspaceRight);
    expect(geometry.decisionRight).toBeLessThanOrEqual(geometry.workspaceRight);
    expect(geometry.primaryActionTop).toBeLessThan(geometry.resultTop);
    expect(geometry.workflowCount).toBe(6);
    expect(geometry.prepareActionCount).toBe(1);
    if (viewport.width >= 1024) {
      expect(geometry.worklistLeft).toBeLessThan(geometry.decisionLeft);
    } else {
      expect(geometry.worklistTop).toBeLessThan(geometry.decisionTop);
    }
    copilotMeasurements.push({
      width: viewport.width,
      height: viewport.height,
      ...geometry,
    });
    const screenshot = await page.screenshot({ fullPage: true });
    if (proofCopilotEvidenceDirectory) {
      await mkdir(proofCopilotEvidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(
          proofCopilotEvidenceDirectory,
          `proof-copilot-${viewport.width}.png`,
        ),
        fullPage: true,
      });
    }
    await testInfo.attach(`proof-copilot-${viewport.width}`, {
      body: screenshot,
      contentType: "image/png",
    });
  }

  if (proofCopilotEvidenceDirectory) {
    await writeFile(
      path.join(proofCopilotEvidenceDirectory, "rendered-measurements.json"),
      `${JSON.stringify(copilotMeasurements, null, 2)}\n`,
      "utf8",
    );
  }

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
