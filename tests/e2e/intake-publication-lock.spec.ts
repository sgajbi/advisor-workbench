import { expect, test } from "@playwright/test";

const BFF_BASE_PATH = "/api/bff/api/v1";

test("keeps the reviewed intake immutable until source publication is confirmed", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });

  let releasePublication!: () => void;
  const publicationGate = new Promise<void>((resolve) => {
    releasePublication = resolve;
  });

  await page.route(`**${BFF_BASE_PATH}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === `${BFF_BASE_PATH}/intake/portfolio-bundle`) {
      await publicationGate;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          correlation_id: "corr-intake-browser-001",
          contract_version: "v1",
          data: {
            published_counts: {
              business_dates: 1,
              portfolios: 1,
              instruments: 0,
              transactions: 0,
              market_prices: 0,
            },
          },
        }),
      });
      return;
    }

    if (path.startsWith(`${BFF_BASE_PATH}/lookups/`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          correlation_id: "corr-intake-browser-lookups",
          contract_version: "v1",
          items: [],
        }),
      });
      return;
    }

    if (path === `${BFF_BASE_PATH}/platform/capabilities`) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "shell_bootstrap_unavailable" }),
      });
      return;
    }

    throw new Error(`Unexpected BFF request in intake publication lock proof: ${path}`);
  });

  await page.goto("/intake", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Create portfolio record/i }).click();

  const values: Array<[string, string]> = [
    ["New portfolio code", "PORT_001"],
    ["Client reference", "CIF_001"],
    ["Responsible advisor code", "ADV_001"],
    ["Base currency", "USD"],
    ["Opening date", "2026-08-08"],
    ["Booking centre", "Singapore"],
    ["Mandate type", "Discretionary"],
    ["Approved risk profile", "Balanced"],
    ["Investment time horizon", "Long term"],
    ["Opening portfolio status", "Pending activation"],
  ];
  for (const [label, value] of values) {
    await page.getByLabel(label).fill(value);
  }

  await page.getByRole("button", { name: "Review request" }).click();
  const publish = page.getByRole("button", { name: "Publish reviewed request" });
  await publish.focus();
  await publish.press("Enter");

  await expect(page.getByText(/Publishing reviewed request/i)).toBeVisible();
  await expect(page.getByText(/editing and file replacement are locked/i)).toBeVisible();
  await expect(page.getByLabel("Client reference")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Change request type" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Edit request" })).toBeDisabled();
  await expect(publish).toBeDisabled();
  await expect(page.getByLabel("Client reference")).toHaveValue("CIF_001");
  await expect(page.getByRole("region", { name: "Intake request editor" })).toBeVisible();

  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasOverflow, "pending intake state must not overflow a 390px viewport").toBeFalsy();

  releasePublication();

  await expect(page.getByText("Publication confirmed")).toBeVisible();
  const requestControl = page.getByRole("region", { name: "Intake request control" });
  await expect(requestControl).toBeFocused();
  await expect(page.getByText("Correlation corr-intake-browser-001")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reviewed request published" })).toBeVisible();
});
