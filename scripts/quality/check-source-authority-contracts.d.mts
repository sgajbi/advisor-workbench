import type { SourceAuthorityContract } from "./source-authority-contracts.mjs";

export function validateSourceAuthorityContracts(
  contracts?: readonly SourceAuthorityContract[],
  options?: { repoRoot?: string },
): string[];

export function enforceSourceAuthorityContracts(options?: { repoRoot?: string }): number;
