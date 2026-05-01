import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) {
    return fallback;
  }
  return process.argv[index + 1];
}

const outputDir = getArg("--output-dir");
if (!outputDir) {
  console.error("Missing required --output-dir argument.");
  process.exit(2);
}

const portfolioId = getArg("--portfolio-id", "PB_SG_GLOBAL_BAL_001");
const manifestPath = path.join(outputDir, "screenshots-manifest.json");
const screenshotDir = path.join(outputDir, "screenshots");

await fs.mkdir(screenshotDir, { recursive: true });

const targets = [
  {
    name: "workbench-performance-evidence",
    label: "Workbench performance evidence mode",
    url: `http://workbench.dev.lotus/performance?portfolioId=${encodeURIComponent(portfolioId)}&mode=evidence`,
  },
  {
    name: "workbench-performance-risk",
    label: "Workbench performance risk mode",
    url: `http://workbench.dev.lotus/performance?portfolioId=${encodeURIComponent(portfolioId)}&mode=risk`,
  },
  {
    name: "prometheus-targets",
    label: "Prometheus target status",
    url: "http://localhost:9190/targets",
  },
  {
    name: "prometheus-up-query",
    label: "Prometheus up query",
    url: "http://localhost:9190/graph?g0.expr=up&g0.show_tree=0&g0.tab=1",
  },
  {
    name: "grafana-home",
    label: "Grafana home or authentication state",
    url: "http://localhost:3300/",
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const captures = [];

for (const target of targets) {
  const filePath = path.join(screenshotDir, `${target.name}.png`);
  const record = {
    ...target,
    path: filePath,
    status: "unknown",
    title: "",
    capturedAt: new Date().toISOString(),
  };

  try {
    const response = await page.goto(target.url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: filePath, fullPage: true });
    record.status = response ? response.status() : "no-response";
    record.title = await page.title();
  } catch (error) {
    record.status = "error";
    record.error = error instanceof Error ? error.message : String(error);
  }

  captures.push(record);
}

await browser.close();

await fs.writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      portfolioId,
      captures,
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log(`Observability screenshots manifest: ${manifestPath}`);
