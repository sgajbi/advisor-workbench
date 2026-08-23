import { createServer } from "node:http";

const PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";
const AS_OF_DATE = "2026-04-10";

export async function startPlaywrightSourceFixtureGateway({ port }) {
  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

    if (
      request.method === "GET" &&
      requestUrl.pathname ===
        `/api/v1/portfolio/portfolios/${PORTFOLIO_ID}/workspace`
    ) {
      sendJson(response, buildPortfolioWorkspaceShell());
      return;
    }

    sendJson(response, { detail: "Smoke fixture route not found" }, 404);
  });

  await new Promise((resolve, reject) => {
    const handleError = (error) => reject(error);
    server.once("error", handleError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", handleError);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("Playwright source fixture did not expose a TCP port.");
  }

  return {
    close: () => closeServer(server),
    port: address.port,
  };
}

function buildPortfolioWorkspaceShell() {
  return {
    as_of_date: AS_OF_DATE,
    portfolio: {
      portfolio_id: PORTFOLIO_ID,
      display_name: "Global Balanced Mandate",
      client_id: "CLIENT_SG_001",
      base_currency: "USD",
      booking_center_code: "SG",
    },
    profile: {
      status: "ACTIVE",
      portfolio_type: "ADVISORY",
      risk_exposure: "MODERATE",
      investment_time_horizon: "LONG_TERM",
      objective: "BALANCED_GROWTH",
      is_leverage_allowed: false,
      open_date: "2024-01-01",
    },
    summary: {
      assets_under_management_base: 23_000,
      invested_market_value_base: 19_000,
      cash_market_value_base: 4_000,
      cash_weight_pct: 17.4,
      position_count: 1,
      cash_balance_count: 1,
    },
    cashflow_outlook: null,
    performance: null,
    rebalance: null,
    control_capabilities: null,
    reporting: null,
    operations: null,
    workflow_cues: [],
    warnings: [],
    partial_failures: [],
  };
}

function sendJson(response, body, statusCode = 200) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
