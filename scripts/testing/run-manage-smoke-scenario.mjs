import { runFixtureScenario } from "./run-e2e-fixture-scenario.mjs";

process.exitCode = await runFixtureScenario({
  familyName: "manage",
  scenarioName: process.argv[2],
  arguments_: process.argv.slice(3),
});
