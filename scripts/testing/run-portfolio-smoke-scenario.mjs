import { runFixtureScenario } from "./run-e2e-fixture-scenario.mjs";

runFixtureScenario({
  familyName: "portfolio",
  scenarioName: process.argv[2],
  arguments_: process.argv.slice(3),
});
