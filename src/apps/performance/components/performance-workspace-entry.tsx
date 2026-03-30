import PerformanceWorkspaceClient from "./performance-workspace-client";

export default function PerformanceWorkspaceEntry(
  props: React.ComponentProps<typeof PerformanceWorkspaceClient>
) {
  return <PerformanceWorkspaceClient {...props} />;
}
