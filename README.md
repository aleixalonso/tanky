# Tanky

Tanky is a TypeScript monorepo for retrieving fuel prices near a location.

## Packages

- `@tanky/types`: shared domain types.
- `@tanky/core`: provider registry, search helpers, and public SDK.
- `@tanky/provider-es`: Spain provider backed by the public fuel station dataset.
- `@tanky/cli`: CLI for best-price and nearby-station lookups.

## Getting started

```bash
pnpm install
pnpm build
pnpm dev
```

Run the CLI through the workspace root:

```bash
pnpm tanky best --lat 41.39 --lon 2.17
pnpm tanky near --lat 41.39 --lon 2.17 --radius 5
```
