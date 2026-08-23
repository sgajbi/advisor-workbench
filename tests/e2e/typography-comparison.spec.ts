import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  startPortfolioFixtureGateway,
  type PortfolioFixtureGateway,
} from "./portfolio-fixture-gateway";

const candidateDirectory = process.env.TYPOGRAPHY_COMPARISON_ASSET_DIR;
const evidenceDirectory = process.env.TYPOGRAPHY_COMPARISON_EVIDENCE_DIR;
const sourceCommit = process.env.TYPOGRAPHY_COMPARISON_SOURCE_COMMIT;
const comparisonEnabled = Boolean(candidateDirectory && evidenceDirectory && sourceCommit);
const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 1024, height: 1000 },
  { width: 768, height: 1024 },
  { width: 519, height: 900 },
] as const;

let fixtureGateway: PortfolioFixtureGateway | null = null;

test.describe.configure({ mode: "default" });

test.beforeAll(async () => {
  if (!comparisonEnabled) return;

  const port = Number(process.env.PORTFOLIO_E2E_FIXTURE_PORT ?? "18139");
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== "portfolio"
  ) {
    throw new Error(`Typography comparison requires the owned fixture at ${expectedGateway}.`);
  }

  fixtureGateway = await startPortfolioFixtureGateway({ port, scenario: "cashflow" });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

test("compares productive Inter and IBM Plex Sans typography on Portfolio Review", async ({
  page,
}) => {
  test.skip(!comparisonEnabled, "Run through npm run test:e2e:typography:compare.");
  test.setTimeout(120_000);

  await mkdir(evidenceDirectory!, { recursive: true });
  await page.goto("/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Portfolio Review", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "AUM: 12,500,000 USD" })).toBeVisible();
  await page.evaluate(async () => document.fonts.ready);

  await installCandidate(page, {
    family: "Inter Candidate",
    faces: [{ file: "InterVariable.woff2", weight: "100 900" }],
  });
  const inter = await captureCandidate(page, "inter");
  await installCandidate(page, {
    family: "IBM Plex Sans Candidate",
    faces: [
      { file: "IBMPlexSans-Regular.woff2", weight: "400" },
      { file: "IBMPlexSans-Medium.woff2", weight: "500" },
      { file: "IBMPlexSans-SemiBold.woff2", weight: "600" },
    ],
  });
  const ibmPlexSans = await captureCandidate(page, "ibm-plex-sans");

  await writeFile(
    resolve(evidenceDirectory!, "typography-comparison.json"),
    `${JSON.stringify(
      {
        generatedAtUtc: new Date().toISOString(),
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        candidateSources: {
          inter: {
            repository: "https://github.com/rsms/inter",
            tag: "v4.1",
            commit: "e3a3d4c57d5ecc01453a575621882a384c1995a3",
          },
          ibmPlexSans: {
            repository: "https://github.com/IBM/plex",
            tag: "@ibm/plex-sans@1.1.0",
            commit: sourceCommit,
          },
          delivery: "checksum-verified data URL for isolated comparison only",
        },
        inter,
        ibmPlexSans,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
});

async function captureCandidate(page: Page, candidate: string) {
  const captures = [];
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("heading", { name: "Portfolio Review", exact: true })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));

    const metrics = await page.locator(".kpi-stat-value").evaluateAll((elements) =>
      elements.map((element) => {
        const value = element as HTMLElement;
        const card = value.closest<HTMLElement>(".portfolio-summary-band-item");
        const valueBounds = value.getBoundingClientRect();
        const cardBounds = card?.getBoundingClientRect();
        const textRange = document.createRange();
        textRange.selectNodeContents(value);
        const style = getComputedStyle(value);
        return {
          text: value.textContent?.trim() ?? "",
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          valueWidth: Math.round(valueBounds.width),
          textWidth: Math.round(textRange.getBoundingClientRect().width),
          cardWidth: Math.round(cardBounds?.width ?? 0),
          fitsCard: Boolean(
            cardBounds &&
              valueBounds.left >= cardBounds.left - 1 &&
              valueBounds.right <= cardBounds.right + 1
          ),
          singleLine: value.scrollHeight <= value.clientHeight + 1,
        };
      })
    );
    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );

    expect(documentOverflow).toBeLessThanOrEqual(0);
    expect(metrics.every((metric) => metric.fitsCard && metric.singleLine)).toBe(true);
    await page.screenshot({
      path: resolve(evidenceDirectory!, `${candidate}-portfolio-review-${viewport.width}.png`),
      fullPage: true,
    });
    captures.push({ viewport, documentOverflow, metrics });
  }
  return captures;
}

async function installCandidate(
  page: Page,
  candidate: { family: string; faces: Array<{ file: string; weight: string }> }
) {
  const fonts = await Promise.all(
    candidate.faces.map(async ({ file, weight }) => ({
      data: (await readFile(resolve(candidateDirectory!, file))).toString("base64"),
      weight,
    }))
  );

  await page.addStyleTag({
    content: fonts
      .map(
        ({ data, weight }) => `
          @font-face {
            font-family: "${candidate.family}";
            src: url("data:font/woff2;base64,${data}") format("woff2");
            font-style: normal;
            font-weight: ${weight};
            font-display: block;
          }
        `
      )
      .join("\n"),
  });
  await page.evaluate(async (candidate) => {
    document.documentElement.style.setProperty(
      "--font-ui",
      `"${candidate.family}", ui-sans-serif, system-ui, sans-serif`
    );
    await Promise.all(
      [400, 500, 600].map((weight) =>
        document.fonts.load(`${weight} 14px "${candidate.family}"`)
      )
    );
    await document.fonts.ready;
  }, candidate);
}
