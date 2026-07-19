type Environment = Readonly<Record<string, string | undefined>>;

export type ReportCentreFixtureScenario =
  | { enabled: false }
  | { enabled: true; port: number };

const DEFAULT_FIXTURE_PORT = 18101;

export function resolveReportCentreFixtureScenario(
  environment: Environment,
): ReportCentreFixtureScenario {
  if (environment.REPORT_CENTRE_E2E_FIXTURE !== "state-matrix") {
    return { enabled: false };
  }

  const port = Number(environment.REPORT_CENTRE_E2E_FIXTURE_PORT ?? DEFAULT_FIXTURE_PORT);
  const expectedGatewayUrl = `http://127.0.0.1:${port}`;
  if (
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    environment.BFF_BASE_URL !== expectedGatewayUrl ||
    environment.WORKBENCH_E2E_FIXTURE_GATEWAY !== "report-centre"
  ) {
    throw new Error(`Report Centre fixture proof requires the owned gateway on port ${port}.`);
  }

  return { enabled: true, port };
}
