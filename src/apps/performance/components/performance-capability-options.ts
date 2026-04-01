import type { WorkspaceCapability } from "@/shell/workspace-capabilities";

export function isCapabilityOptionSupported(
  capability: WorkspaceCapability | undefined,
  kind: "dimension" | "frequency",
  value: string
) {
  const supportedValues =
    kind === "dimension" ? capability?.supportedDimensions : capability?.supportedFrequencies;

  if (!supportedValues?.length) {
    return true;
  }

  return supportedValues.includes(value);
}
