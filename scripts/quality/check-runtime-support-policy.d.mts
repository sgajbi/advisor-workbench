export type RuntimeSupportPolicyEvidence = {
  packageJson: {
    packageManager?: string;
    engines: Record<string, string>;
    devEngines: Record<string, { name: string; version: string; onFail: string }>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  packageLock: {
    packages: Record<
      string,
      {
        devDependencies?: Record<string, string>;
        engines?: Record<string, string>;
      }
    >;
  };
  policy: {
    nextReviewBy: string;
    browserPolicy: Record<string, unknown> & { certificationStatus: string };
    productionContainer: {
      version: string;
      distribution: string;
      digest: string;
      executionUser: string;
    };
    scalingPolicy: Record<string, unknown> & { certificationStatus: string };
    explicitNonClaims: string[];
    [key: string]: unknown;
  };
  dockerfile: string;
  makefile: string;
  playwrightConfig: string;
  livePlaywrightConfig: string;
  workflowSources: Record<string, string>;
  execution?: {
    enforceExact?: boolean;
    nodeVersion?: string;
    npmVersion?: string;
  };
  today?: string;
};

export function validateRuntimeSupportPolicy(
  evidence: RuntimeSupportPolicyEvidence
): string[];

export function collectRuntimeSupportPolicyFailures(root?: string): string[];
