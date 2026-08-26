import type { ChildProcess } from "node:child_process";

export function runFixtureScenario(input: {
  familyName: string;
  scenarioName: string;
  arguments_?: string[];
}): ChildProcess;

export function parseRunnerArguments(arguments_: string[]): {
  focusName: string | null;
  forwardedArguments: string[];
};
