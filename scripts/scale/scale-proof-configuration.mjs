const DEPLOYMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export function resolveScaleProofDeploymentId({ value, skipBuild }) {
  const configured = value?.trim();
  if (configured) {
    if (!DEPLOYMENT_ID_PATTERN.test(configured)) {
      throw new Error("WORKBENCH_DEPLOYMENT_ID is invalid for scale proof.");
    }
    return configured;
  }
  if (skipBuild) {
    throw new Error(
      "WORKBENCH_DEPLOYMENT_ID is required when scale proof reuses a prebuilt image.",
    );
  }
  return "scale-proof-issue-619";
}
