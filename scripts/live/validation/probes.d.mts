import type { ValidationSummary } from "./shared-types";

export function checkDns(
  summary: ValidationSummary,
  hostname: string,
  options?: {
    required?: boolean;
    lookup?: (hostname: string) => Promise<{ address: string }>;
  }
): Promise<Record<string, unknown>>;

export function fetchJson<T = unknown>(
  summary: ValidationSummary,
  url: string,
  description: string,
  timeoutMs: number,
  fetchImpl?: (input: string, init?: Record<string, unknown>) => Promise<Response>
): Promise<T>;

export function fetchText(
  summary: ValidationSummary,
  url: string,
  description: string,
  timeoutMs: number,
  fetchImpl?: (input: string, init?: Record<string, unknown>) => Promise<Response>
): Promise<string>;

export function postJson<T = unknown>(
  summary: ValidationSummary,
  url: string,
  description: string,
  timeoutMs: number,
  body: unknown,
  fetchImpl?: (input: string, init?: Record<string, unknown>) => Promise<Response>
): Promise<T>;

export function postJsonExpectingStatus<T = unknown>(
  summary: ValidationSummary,
  url: string,
  description: string,
  timeoutMs: number,
  expectedStatus: number,
  body: unknown,
  fetchImpl?: (input: string, init?: Record<string, unknown>) => Promise<Response>
): Promise<T>;
