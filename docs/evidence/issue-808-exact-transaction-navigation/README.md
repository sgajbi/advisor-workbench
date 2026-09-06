# Exact transaction navigation proof

This evidence supports Workbench issue #808. It proves that an advisor can reopen the exact booked
event from a durable address even when the transaction is beyond the first 200-row ledger page.

## Governed behavior

- Workbench calls Gateway's exact transaction endpoint once per route hydration with the selected portfolio,
  transaction, as-of date, reporting currency, and `include_projected=false`.
- Window focus, reconnect, and successful or failed component remount do not silently repeat that read,
  including after the normal inactive-query collection window within the same Workbench session. A visible retry is the only
  recovery action that recontacts Gateway for the unchanged active review context.
- Strict parsing rejects malformed evidence and any portfolio or transaction identity mismatch.
- Empty or malformed successful response bodies are treated as invalid source contracts rather
  than generic unavailability.
- Not found, access restricted, invalid request, source unavailable, malformed contract, and
  identity mismatch remain distinct; the surrounding ledger remains usable.
- TanStack Query owns the request identity and cancellation boundary, so a delayed prior address
  cannot replace the current transaction.
- The existing drawer and ledger remain the sole presentation model; no page scan, source-service
  call, fallback record, or second cache was introduced.

## Regression proof

`npm run test:e2e:portfolio:transaction-navigation` uses a deterministic 201-row Gateway-shaped
fixture. At desktop and compact widths it selects row 201, closes with focus restored, reopens,
reloads the durable address, and exercises browser Back/Forward navigation. The reload assertion
also proves the exact request retains date and currency context.

Focused contract, component, race, query-key, and screen tests are in:

- `tests/unit/portfolio-transaction-record.test.ts`
- `tests/unit/portfolio-transactions-record-workspace.test.tsx`
- `tests/unit/portfolio-record-screen-client.test.tsx`
- `tests/unit/portfolio-query-keys.test.ts`

The fixture is regression evidence, not canonical production-data certification.
