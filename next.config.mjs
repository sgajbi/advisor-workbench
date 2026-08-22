/** @type {import('next').NextConfig} */
const configuredLotusEnvironment = process.env.LOTUS_ENVIRONMENT
  ?.trim()
  .toLowerCase();
const lotusEnvironment = configuredLotusEnvironment || "dev";
const workbenchBuildEnvironment =
  configuredLotusEnvironment || "unconfigured";
const deploymentId =
  process.env.WORKBENCH_DEPLOYMENT_ID?.trim() ||
  (lotusEnvironment === "dev" ? "local-development" : undefined);

if (!deploymentId) {
  throw new Error(
    "WORKBENCH_DEPLOYMENT_ID is required for non-development Workbench builds.",
  );
}

const nextConfig = {
  output: "standalone",
  deploymentId,
  env: {
    WORKBENCH_BUILD_DEPLOYMENT_ID: deploymentId,
    WORKBENCH_BUILD_ENVIRONMENT: workbenchBuildEnvironment,
  },
  reactStrictMode: true,
  allowedDevOrigins: ["workbench.dev.lotus", "127.0.0.1", "localhost"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
