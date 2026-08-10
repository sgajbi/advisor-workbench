/** @type {import('next').NextConfig} */
const lotusEnvironment = process.env.LOTUS_ENVIRONMENT?.trim().toLowerCase() || "dev";
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
  reactStrictMode: true,
  allowedDevOrigins: ["workbench.dev.lotus", "127.0.0.1", "localhost"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
