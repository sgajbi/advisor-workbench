type FixtureGateway = {
  close: () => Promise<void>;
  port: number;
};

export {};

type FixtureGatewayModule = {
  startPlaywrightSourceFixtureGateway: (options: {
    port: number;
  }) => Promise<FixtureGateway>;
};

const FIXTURE_MODULE_PATH: string =
  "../../scripts/testing/playwright-source-fixture-gateway.mjs";
const fixtureModule = (await import(
  FIXTURE_MODULE_PATH
)) as FixtureGatewayModule;

describe("Playwright source fixture gateway", () => {
  let fixture: FixtureGateway | null = null;

  afterEach(async () => {
    await fixture?.close();
    fixture = null;
  });

  it("serves only the source-confirmed portfolio shell required by server rendering", async () => {
    fixture = await fixtureModule.startPlaywrightSourceFixtureGateway({
      port: 0,
    });

    const response = await fetch(
      `http://127.0.0.1:${fixture.port}/api/v1/portfolio/portfolios/PB_SG_GLOBAL_BAL_001/workspace`,
    );
    const payload = (await response.json()) as {
      as_of_date: string;
      portfolio: { portfolio_id: string; base_currency: string };
    };

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      as_of_date: "2026-04-10",
      portfolio: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        base_currency: "USD",
      },
    });

    const unsupported = await fetch(
      `http://127.0.0.1:${fixture.port}/api/v1/portfolio/portfolios/PB_SG_GLOBAL_BAL_001/book`,
    );
    expect(unsupported.status).toBe(404);
  });
});
