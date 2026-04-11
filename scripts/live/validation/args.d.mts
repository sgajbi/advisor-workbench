import type { ValidationConfig } from "./shared-types";

export function parseArgs(argv: string[]): Map<string, string>;

export function resolveValidationConfig(argv: string[], cwd?: string): ValidationConfig;
