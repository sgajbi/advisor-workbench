"use client";

import dynamic from "next/dynamic";

const PerformanceWorkspaceClient = dynamic(
  () => import("./performance-workspace-client"),
  {
    ssr: false,
  }
);

export default PerformanceWorkspaceClient;
