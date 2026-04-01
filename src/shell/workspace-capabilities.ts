export type WorkspaceCapabilityState =
  | "supported"
  | "partial"
  | "unavailable"
  | "hidden";

export type WorkspaceCapability = {
  state: WorkspaceCapabilityState;
  reason?: string;
  coverageLevel?: string;
  fallbackAvailable?: boolean;
  earliestAvailableDate?: string;
  latestAvailableDate?: string;
  supportedDimensions?: string[];
  supportedFrequencies?: string[];
};

export function supported(reason?: string): WorkspaceCapability {
  return { state: "supported", reason };
}

export function partial(reason: string): WorkspaceCapability {
  return { state: "partial", reason };
}

export function unavailable(reason: string): WorkspaceCapability {
  return { state: "unavailable", reason };
}

export function hidden(reason?: string): WorkspaceCapability {
  return { state: "hidden", reason };
}

export function isRenderableCapability(capability: WorkspaceCapability): boolean {
  return capability.state !== "hidden";
}

export function isSupportedCapability(capability: WorkspaceCapability): boolean {
  return capability.state === "supported";
}

export function isPartialCapability(capability: WorkspaceCapability): boolean {
  return capability.state === "partial";
}
