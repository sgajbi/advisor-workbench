import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

import {
  NEXT_DEVELOPMENT_DIRECTORY,
  NEXT_PRODUCTION_DIRECTORY,
} from "./scripts/config/next-artifact-layout.mjs";

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

export function createNextConfig(phase) {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    output: "standalone",
    distDir:
      phase === PHASE_DEVELOPMENT_SERVER
        ? NEXT_DEVELOPMENT_DIRECTORY
        : NEXT_PRODUCTION_DIRECTORY,
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

  return nextConfig;
}

export default createNextConfig;
