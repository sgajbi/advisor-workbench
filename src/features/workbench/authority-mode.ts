const DEVELOPMENT_AUTHORITY_ENVIRONMENTS = new Set([
  "dev",
  "development",
  "local",
  "test",
]);

export function isDevelopmentAuthorityEnvironment(
  environment = process.env.LOTUS_ENVIRONMENT,
): boolean {
  return DEVELOPMENT_AUTHORITY_ENVIRONMENTS.has(
    environment?.trim().toLowerCase() || "unconfigured",
  );
}

export function requiresAuthenticatedSessionPrincipal(
  environment = process.env.LOTUS_ENVIRONMENT,
): boolean {
  return !isDevelopmentAuthorityEnvironment(environment);
}

export type ConfiguredAuthorityMode =
  | "development_configured"
  | "authenticated_session";

export type AuthorityModeResolution =
  | ConfiguredAuthorityMode
  | "development_authority_not_allowed"
  | "invalid_authority_mode";

export function resolveConfiguredAuthorityMode(
  environmentVariable: string,
): AuthorityModeResolution {
  const environment =
    process.env.LOTUS_ENVIRONMENT?.trim().toLowerCase() || "unconfigured";
  const isDevelopmentEnvironment = isDevelopmentAuthorityEnvironment(environment);
  const configuredMode = process.env[environmentVariable]?.trim().toLowerCase();

  if (
    configuredMode &&
    configuredMode !== "development_configured" &&
    configuredMode !== "authenticated_session"
  ) {
    return "invalid_authority_mode";
  }

  const authorityMode: ConfiguredAuthorityMode =
    configuredMode === "development_configured" ||
    configuredMode === "authenticated_session"
      ? configuredMode
      : isDevelopmentEnvironment
        ? "development_configured"
        : "authenticated_session";

  if (authorityMode === "development_configured" && !isDevelopmentEnvironment) {
    return "development_authority_not_allowed";
  }

  return authorityMode;
}
