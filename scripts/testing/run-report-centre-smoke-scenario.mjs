import { runFixtureScenario } from "./run-e2e-fixture-scenario.mjs";

process.exitCode = await runFixtureScenario({
  familyName: "reports",
  scenarioName: "state-matrix",
  arguments_: process.argv.slice(2),
});
