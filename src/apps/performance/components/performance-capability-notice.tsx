import { WorkspaceCapabilityPanel } from "@/design-system";
import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

export default function PerformanceCapabilityNotice({
  capability,
  partialTitle,
  unavailableTitle,
  body,
  hint,
}: {
  capability: WorkspaceCapability;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="performance-capability-notice">
      <WorkspaceCapabilityPanel
        capability={capability}
        partialTitle={partialTitle}
        unavailableTitle={unavailableTitle}
        body={body}
        hint={hint}
      />
    </div>
  );
}
