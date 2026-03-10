# `@tanky/sdk`

Public SDK facade for Tanky fuel-price lookups.

This package hides provider registration from consumers and exposes a small API:

- `getBestPrice`
- `getNearestStations`
- `searchStations`
- `createTankySdk`

## Usage

```ts
import { getBestPrice } from "@tanky/sdk";

const station = await getBestPrice({
  country: "ES",
  location: { lat: 41.39, lon: 2.17 },
  fuelType: "diesel",
});
```

## Behavior

The SDK currently auto-wires the Spain provider when `country: "ES"` is requested.

Consumers do not need to manually register providers.

## Custom transport

If you need a runtime-specific HTTP transport, create an SDK instance and inject a country client:

```ts
import { createTankySdk, HttpSpainFuelApiClient } from "@tanky/sdk";

const sdk = createTankySdk({
  countryClients: {
    ES: new HttpSpainFuelApiClient(fetch),
  },
});
```

This is useful for environments like Tauri, where you may want to supply a native HTTP implementation instead of the default web `fetch`.

## Exports

The package also re-exports the main shared types from `@tanky/types` and query option types from `@tanky/core`.
