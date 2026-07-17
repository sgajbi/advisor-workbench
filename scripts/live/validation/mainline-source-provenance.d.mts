export type SourceRepositoryProvenance = {
  repository: string;
  branch: string | null;
  headSha: string | null;
  expectedMainSha: string | null;
  passed: boolean;
  reason: string;
};

export const CANONICAL_REPOSITORIES: readonly string[];

export function evaluateRepository(input: {
  name: string;
  path: string;
  runGit: (path: string, args: string[]) => string;
}): SourceRepositoryProvenance;

export function buildMainlineSourceManifest(
  projectsRoot: string,
  runGit: (path: string, args: string[]) => string,
): {
  schemaVersion: string;
  proofScope: string;
  certificationClassification: string;
  repositories: SourceRepositoryProvenance[];
  passed: boolean;
};

export function validateMainlineSourceManifest(manifest: unknown): {
  schemaVersion: string;
  proofScope: string;
  certificationClassification: string;
  repositories: SourceRepositoryProvenance[];
  passed: true;
};

export function bindMainlineSourceManifestToRuntime(
  manifest: unknown,
  runtime: { repository: string; commitSha: string | null | undefined; branch: string | null | undefined },
): {
  repository: string;
  commitSha: string;
  branch: "main";
  expectedMainSha: string;
};

export function loadValidatedMainlineSourceManifest(manifestPath: string): {
  schemaVersion: string;
  proofScope: string;
  certificationClassification: string;
  repositories: SourceRepositoryProvenance[];
  passed: true;
};
