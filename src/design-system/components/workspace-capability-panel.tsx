import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

import CapabilityStatePanel from "./capability-state-panel";

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
  return (
    <CapabilityStatePanel
      capability={capability}
      partialTitle={partialTitle}
      unavailableTitle={unavailableTitle}
      body={body}
      partialHint={hint}
      unavailableHint={hint}
      why={why}
      illustration={illustration}
      centered={centered}
    />
  );
}
