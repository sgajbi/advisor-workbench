/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  allowedDevOrigins: ["workbench.dev.lotus", "127.0.0.1", "localhost"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
