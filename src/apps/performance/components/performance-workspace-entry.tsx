"use client";

import { useEffect, useState } from "react";

import PerformanceWorkspaceClient from "./performance-workspace-client";

export default function PerformanceWorkspaceEntry(
  props: React.ComponentProps<typeof PerformanceWorkspaceClient>
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <PerformanceWorkspaceClient {...props} />;
}
