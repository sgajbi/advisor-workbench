import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import EmptyStatePanel from "./empty-state-panel";
import ModuleStatePanel from "./module-state-panel";

export default function WorkspaceCapabilityPanel({
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
