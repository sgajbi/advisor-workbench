export function runFixtureScenario(input: {
  familyName: string;
  scenarioName: string;
  arguments_?: string[];
  resultDirectory?: string;
  environmentOverrides?: NodeJS.ProcessEnv;
}): Promise<number>;

export function parseRunnerArguments(arguments_: string[]): {
  focusName: string | null;
  forwardedArguments: string[];
};
