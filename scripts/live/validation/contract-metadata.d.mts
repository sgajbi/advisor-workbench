import type { CanonicalContractMetadata, PanelRegistryMetadata } from "./shared-types";

export const DEFAULT_CANONICAL_CONTRACT: CanonicalContractMetadata;
export const DEFAULT_PANEL_REGISTRY: PanelRegistryMetadata;

export function loadCanonicalContractMetadata(cwd?: string): Promise<CanonicalContractMetadata>;
export function loadWorkbenchPanelRegistryMetadata(cwd?: string): Promise<PanelRegistryMetadata>;
