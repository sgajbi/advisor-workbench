export interface ScenarioResult {
  title: string;
  retry?: number;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  duration_ms?: number;
  errors?: string[];
}

export interface ScenarioProof {
  counts: {
    expected: number;
    planned: number;
    executed: number;
    passed: number;
    failed: number;
    skipped: number;
    timed_out: number;
    interrupted: number;
  };
  findings: string[];
  result: "passed" | "failed";
}

export function evaluateScenarioProof(input: {
  expectedTests: string[];
  plannedTests: string[];
  results: ScenarioResult[];
  initialFindings?: string[];
}): ScenarioProof;

export default class GovernedScenarioReporter {}
