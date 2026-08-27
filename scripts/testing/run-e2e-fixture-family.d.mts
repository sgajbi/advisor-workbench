export function parseFamilyArguments(arguments_: string[]): {
  familyName: string | null;
  forwardedArguments: string[];
};

export function buildFamilyProof(input: {
  familyName: string;
  scenarioOutcomes: Array<{
    scenario: string;
    exit_code: number;
    artifact: null | {
      result: string;
      counts: {
        expected: number;
        executed: number;
        passed: number;
        skipped: number;
        failed: number;
        timed_out: number;
        interrupted: number;
      };
    };
  }>;
}): {
  counts: Record<string, number>;
  findings: string[];
  result: "passed" | "failed";
};

export function buildReuseEnvironment(hasValidatedBuild: boolean):
  | { PLAYWRIGHT_REUSE_VALIDATED_BUILD: "1" }
  | Record<string, never>;

export function provesValidatedBuild(input: {
  exitCode: number;
  artifact: null | { result: string };
  buildExists: boolean;
}): boolean;

export function runFixtureFamilies(arguments_?: string[]): Promise<number>;

export function renderFamilySummary(artifact: Record<string, unknown>): string;
