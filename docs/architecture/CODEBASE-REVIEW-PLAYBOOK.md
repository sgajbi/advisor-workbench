# Codebase Review Playbook

## Purpose

Keep Lotus workbench cleanup and hardening evidence-based.

## Review Units

1. shell and route architecture
2. design-system source of truth
3. app package structure
4. degraded-state and resilience behavior
5. test and documentation coverage
6. gateway contract ownership and upstream supportability
7. latency-sensitive UI fetch patterns and deferred rendering discipline

## Status Model

1. `Planned`
2. `In Review`
3. `Hardened`
4. `Signed Off`
5. `Follow-Up Needed`

## Evidence Standard

A scope is not signed off unless it has:

1. code evidence where applicable,
2. test evidence where applicable,
3. documentation aligned to implementation reality,
4. explicit follow-up items for anything intentionally deferred.

## Current Focus

The current review focus is Portfolio, Performance, and Advisory product-surface hardening:

1. only expose Gateway-backed features that are actually implemented upstream,
2. keep business shaping in Gateway/domain services rather than page components,
3. remove dead or duplicated API surfaces,
4. improve latency realism and browser-level validation for critical workbench flows.
