import { parseArgs } from "node:util";

import { validateAndWriteIdeaCapacitySeedEvidence } from "./validation/idea-capacity-seed-evidence.mjs";

const { values } = parseArgs({
  options: {
    manifest: { type: "string" },
    workload: { type: "string" },
    output: { type: "string" },
    "commit-sha": { type: "string" },
    branch: { type: "string" },
    "run-id": { type: "string" },
  },
});

for (const name of ["manifest", "workload", "output", "commit-sha", "branch", "run-id"]) {
  if (!values[name]) {
    throw new Error(`Missing required --${name}`);
  }
}

await validateAndWriteIdeaCapacitySeedEvidence({
  manifestPath: values.manifest,
  workloadPath: values.workload,
  evidencePath: values.output,
  commitSha: values["commit-sha"],
  branch: values.branch,
  runId: values["run-id"],
});

console.log("Idea capacity seed evidence validated");
