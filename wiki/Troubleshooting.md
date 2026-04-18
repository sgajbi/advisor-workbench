# Troubleshooting

## Common checks

- if the UI looks right on localhost but breaks on canonical hosts, fix the runtime and host mapping first
- if a route appears active in old docs, verify whether it is now a compatibility redirect
- if a screen looks populated but canonical validation fails, treat it as diagnostic evidence only
- if product data looks wrong, inspect gateway responses before adjusting frontend presentation

## Useful commands

```bash
make check
make test-e2e
npm run live:validate
```

## References

- [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- [docs/architecture/CODEBASE-REVIEW-LEDGER.md](../docs/architecture/CODEBASE-REVIEW-LEDGER.md)
