import { expect, test, type Page } from "@playwright/test";

import { observeBrowserRuntimeFailures } from "./browser-runtime-reliability";
import { buildPlatformCapabilitiesFixture } from "./platform-capabilities-fixture";

const BFF_BASE_PATH = "/api/bff/api/v1";
const RECORD_COUNT = 21;
const PREVIEW_PAGE_SIZE = 10;

test("keeps operational file review bounded, complete, and responsive", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const browserRuntime = observeBrowserRuntimeFailures(page);

  const publishedPayloads: Record<string, unknown>[] = [];
  await page.route(`**${BFF_BASE_PATH}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === `${BFF_BASE_PATH}/intake/portfolio-bundle`) {
      publishedPayloads.push(
        JSON.parse(route.request().postData() ?? "{}") as Record<string, unknown>,
      );
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          correlation_id: "corr-intake-preview-browser-001",
          contract_version: "v1",
          data: {
            published_counts: {
              business_dates: 1,
              portfolios: 1,
              instruments: RECORD_COUNT,
              transactions: RECORD_COUNT,
              market_prices: RECORD_COUNT,
            },
          },
        }),
      });
      return;
    }

    if (path === `${BFF_BASE_PATH}/platform/capabilities`) {
      await route.fulfill({
        json: buildPlatformCapabilitiesFixture(),
      });
      return;
    }

    throw new Error(`Unexpected BFF request in intake record-preview proof: ${path}`);
  });

  await page.goto("/intake", { waitUntil: "domcontentloaded" });
  const taskChooser = page.getByRole("region", { name: "Choose an intake request" });
  await expect(taskChooser).toHaveAttribute("data-ready", "true");
  await page.getByRole("button", { name: /Import an intake file/i }).click();
  await expect(page.getByRole("region", { name: "Intake request editor" })).toBeVisible();
  await page.getByLabel("Supported CSV intake file").setInputFiles({
    name: "operational-intake.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(validCsvWithRecords(RECORD_COUNT)),
  });

  await expect(page.getByText("Ready for review")).toBeVisible();
  await page.getByRole("button", { name: "Review request" }).click();
  await expect(page.getByTestId("intake-preview-record")).toHaveCount(0);

  const transactionPreview = page.getByRole("group", { name: "Transaction records preview" });
  await transactionPreview.getByText("Transaction records", { exact: true }).click();
  await expect(transactionPreview.getByTestId("intake-preview-record")).toHaveCount(PREVIEW_PAGE_SIZE);
  await expect(transactionPreview.getByText(`Records 1–10 of ${RECORD_COUNT}`)).toBeVisible();
  await expect(transactionPreview.getByText("Page 1 of 3")).toHaveAttribute("aria-current", "page");
  await expect(transactionPreview.getByRole("heading", {
    name: "Transaction TRN_PORT_001_SEC_021_21",
  })).toHaveCount(0);
  await expectNoHorizontalOverflow(page, "desktop preview");

  const next = transactionPreview.getByRole("button", { name: "Next transaction records" });
  await next.focus();
  await next.press("Enter");
  await expect(next).toBeFocused();
  await expect(transactionPreview.getByText(`Records 11–20 of ${RECORD_COUNT}`)).toBeVisible();
  await expect(transactionPreview.getByTestId("intake-preview-record")).toHaveCount(PREVIEW_PAGE_SIZE);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(transactionPreview.getByText("Page 2 of 3")).toBeVisible();
  await expectNoHorizontalOverflow(page, "tablet preview");
  await next.press("Space");
  await expect(transactionPreview.getByText(`Records 21–21 of ${RECORD_COUNT}`)).toBeVisible();
  await expect(transactionPreview.getByTestId("intake-preview-record")).toHaveCount(1);
  await expect(transactionPreview.getByRole("heading", {
    name: "Transaction TRN_PORT_001_SEC_021_21",
  })).toBeVisible();
  await expect(next).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(transactionPreview.getByText("Page 3 of 3")).toHaveAttribute("aria-current", "page");
  await expect(transactionPreview.getByRole("button", { name: "Previous transaction records" })).toBeVisible();
  await expect(next).toBeVisible();
  await expectNoHorizontalOverflow(page, "narrow preview");

  await page.getByRole("button", { name: "Publish reviewed request" }).click();
  await expect(page.getByText("Publication confirmed")).toBeVisible();
  expect(publishedPayloads).toHaveLength(1);
  browserRuntime.assertClean();
  const [publishedEnvelope] = publishedPayloads;
  expect(Object.keys(publishedEnvelope)).toEqual(["body"]);
  const publishedPayload = publishedEnvelope.body as Record<string, unknown>;
  expect((publishedPayload.instruments as unknown[]).length).toBe(RECORD_COUNT);
  expect((publishedPayload.transactions as Array<{ transaction_id: string }>).map(
    ({ transaction_id }) => transaction_id,
  )).toEqual(
    Array.from({ length: RECORD_COUNT }, (_, index) =>
      `TRN_PORT_001_SEC_${String(index + 1).padStart(3, "0")}_${index + 1}`,
    ),
  );
  expect((publishedPayload.marketPrices as unknown[]).length).toBe(RECORD_COUNT);
});

async function expectNoHorizontalOverflow(page: Page, context: string) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow, `${context} must not overflow horizontally`).toBeFalsy();
}

function validCsvWithRecords(recordCount: number): string {
  const header = [
    "portfolio_id",
    "base_currency",
    "open_date",
    "risk_exposure",
    "investment_time_horizon",
    "portfolio_type",
    "booking_center",
    "cif_id",
    "advisor_id",
    "status",
    "security_id",
    "instrument_name",
    "isin",
    "product_type",
    "transaction_type",
    "quantity",
    "price",
    "transaction_date",
  ].join(",");
  const rows = Array.from({ length: recordCount }, (_, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    return [
      "PORT_001",
      "USD",
      "2026-08-08",
      "Balanced",
      "Long term",
      "Discretionary",
      "Singapore",
      "CIF_001",
      "ADV_001",
      "Pending activation",
      `SEC_${sequence}`,
      `Global Equity Fund ${sequence}`,
      `US${String(index + 1).padStart(10, "0")}`,
      "Fund",
      "BUY",
      String(index + 1),
      "100",
      "2026-08-08T00:00:00Z",
    ].join(",");
  });
  return [header, ...rows].join("\n");
}
