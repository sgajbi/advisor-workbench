import { mkdir } from "node:fs/promises";
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
const evidenceRoot = process.env.ISSUE_967_EVIDENCE_DIR ?? process.env.ISSUE_861_EVIDENCE_DIR;
const evidenceDirectory = evidenceRoot
  ? path.resolve(evidenceRoot, "proof-copilot")
  : null;
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

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/workbench/${portfolioId}?mode=proof`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  await expect(
    page.getByRole("heading", { name: "Evidence Pack", level: 1 }),
  ).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Load evidence", exact: true }).click();
  await expect(page.getByText("Evidence pack loaded.", { exact: true })).toBeVisible();
  expect(fixtureGateway?.getLastLoadedProofPackId()).toBe(manageProofPackFixtureIds.initial);

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
  await expect(page.getByText(manageProofPackFixtureIds.published, { exact: true })).toBeVisible();
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
  await expect(page.getByText("Human review required", { exact: true })).toBeVisible();
  await expect(page.getByText("Internal working use only", { exact: true })).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 1024, height: 900 },
    { width: 768, height: 900 },
    { width: 519, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(prepareMemo).toBeVisible();
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(
      geometry.documentWidth,
      `PM Copilot has page-level horizontal overflow at ${viewport.width}px.`,
    ).toBeLessThanOrEqual(geometry.clientWidth);
    const screenshot = await page.screenshot({ fullPage: true });
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: path.join(evidenceDirectory, `proof-copilot-${viewport.width}.png`),
        fullPage: true,
      });
    }
    await testInfo.attach(`proof-copilot-${viewport.width}`, {
      body: screenshot,
      contentType: "image/png",
    });
  }

  await runtime.assertStylesAreHeadManaged();
  runtime.assertClean();
});
