import { EmptyStatePanel, ModuleStatePanel } from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

export default function PortfolioCapabilityState({
  capability,
  partialTitle,
  unavailableTitle,
  body,
  hint,
  why,
  illustration = false,
  centered = false,
}: {
  capability: WorkspaceCapability;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  hint?: string;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
  illustration?: boolean;
  centered?: boolean;
}) {
  if (capability.state === "partial") {
    return (
      <ModuleStatePanel
        state="partial"
        title={partialTitle}
        body={body}
        hint={hint}
        why={why}
      />
    );
  }

  return (
    <EmptyStatePanel
      title={unavailableTitle}
      body={body}
      hint={hint}
      why={why}
      illustration={illustration}
      centered={centered}
    />
  );
}
