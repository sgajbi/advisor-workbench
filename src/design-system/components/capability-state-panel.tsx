import type { WorkspaceCapability } from "@/shell/workspace-capabilities";
import { isRenderableCapability } from "@/shell/workspace-capabilities";

import ScreenStatePanel, { type ScreenStateSurface } from "./screen-state-panel";

export default function CapabilityStatePanel({
  capability,
  partialTitle,
  unavailableTitle,
  body,
  partialHint,
  unavailableHint,
  why,
  illustration = false,
  centered = false,
  className,
  surface = "default",
}: {
  capability: WorkspaceCapability;
  partialTitle: string;
  unavailableTitle: string;
  body: string;
  partialHint?: string;
  unavailableHint?: string;
  why?: {
    body: string;
    title?: string;
    label?: string;
  };
  illustration?: boolean;
  centered?: boolean;
  className?: string;
  surface?: ScreenStateSurface;
}) {
  if (!isRenderableCapability(capability)) {
    return null;
  }

  const kind = capability.state === "partial" ? "partial" : "unavailable";

  return (
    <ScreenStatePanel
      kind={kind}
      title={kind === "partial" ? partialTitle : unavailableTitle}
      body={body}
      hint={kind === "partial" ? partialHint : unavailableHint}
      why={why}
      illustration={illustration}
      centered={centered}
      className={className}
      surface={surface}
    />
  );
}
