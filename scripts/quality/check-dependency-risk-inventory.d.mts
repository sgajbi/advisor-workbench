export interface DependencyRiskInventoryValidationInput {
  packageJson: Record<string, unknown>;
  packageLock: Record<string, unknown>;
  inventory: Record<string, unknown>;
  schema: Record<string, unknown>;
  today?: string;
}

export function validateDependencyRiskInventory(
  input: DependencyRiskInventoryValidationInput
): string[];

export function collectDependencyRiskInventoryFailures(root?: string): string[];
