import { runFixtureScenario } from "./run-e2e-fixture-scenario.mjs";

process.exitCode = await runFixtureScenario({
  familyName: "performance",
  scenarioName: process.argv[2],
  arguments_: process.argv.slice(3),
});
