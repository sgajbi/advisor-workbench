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

export function normalizePlaywrightChildEnvironment<
  TEnvironment extends Record<string, string | undefined>,
>(environment: TEnvironment): Omit<TEnvironment, "NO_COLOR">;
