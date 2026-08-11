export interface RuntimeStateHolderReference {
  file: string;
  symbol: string;
}

export interface RuntimeStateHolderInventoryEntry {
  id: string;
  file: string;
  symbols: string[];
  classification: string;
  purpose: string;
  bounds: string;
  replicaBehavior: string;
  businessAuthority: boolean;
  sessionAuthority: boolean;
  temporaryException?: {
    issue: number;
    expiresOn: string;
    requiredRemediation: string;
  };
}

export interface RuntimeStateInventory {
  nextReviewBy: string;
  stateHolders: RuntimeStateHolderInventoryEntry[];
  [key: string]: unknown;
}

export interface RuntimeStateInventoryValidationInput {
  inventory: RuntimeStateInventory;
  schema: Record<string, unknown>;
  sourceFiles: Record<string, string>;
  nextConfig: string;
  discoveredStateHolders: RuntimeStateHolderReference[];
  today?: string;
}

export function scanRuntimeStateHolders(input?: {
  root?: string;
  sourceRoot?: string;
}): RuntimeStateHolderReference[];

export function scanRuntimeStateSource(input: {
  source: string;
  file?: string;
  scriptKind?: number;
}): RuntimeStateHolderReference[];

export function validateRuntimeStateInventory(
  input: RuntimeStateInventoryValidationInput,
): string[];

export function collectRuntimeStateInventoryFailures(root?: string): string[];
