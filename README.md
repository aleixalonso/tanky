<p align="center">
  <img src="apps/menubar-macos/src-tauri/icons/icon.png" alt="Tanky logo" width="140" />
</p>
<h1 align="center">Tanky</h1>
<p align="center">
  <a href="https://github.com/aleixalonso/tanky/actions/workflows/release-cli.yml"><img src="https://github.com/aleixalonso/tanky/actions/workflows/release-cli.yml/badge.svg?branch=main" alt="CLI Release" /></a>&nbsp;
  <a href="https://www.npmjs.com/package/@tanky/cli"><img src="https://img.shields.io/npm/v/%40tanky%2Fcli" alt="npm version" /></a>&nbsp;
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white" alt="Node.js >=22" /></a>&nbsp;
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

Tanky is a monorepo with a TypeScript SDK, CLI, and a macOS menubar desktop app for fuel price lookup.

Tagline: **Fuel price lookup, built for automation and extensibility.**

## Quick Start

Install globally:

```bash
npm i -g @tanky/cli
```

Run:

```bash
tanky best --lat 41.39 --lon 2.17 --fuel gasoline95 --radius 5
```

## Features

- Find the cheapest fuel station near a location (`best`)
- Find nearby stations (`near`)
- macOS menubar app (Tauri 2 + React + TypeScript)
- Filter by fuel type
- Configure search radius
- Markdown CLI output by default
- JSON output for automation (`--json`)
- Modular provider architecture for multi-country support
- Provider-side caching for dataset fetches
- TypeScript SDK for programmatic usage

## Installation

### From this repository

```bash
pnpm install
pnpm build
```

Run CLI commands from the monorepo root:

```bash
pnpm tanky best --lat 41.39 --lon 2.17 --fuel gasoline95
pnpm tanky near --lat 41.39 --lon 2.17 --radius 5 --limit 10
```

Run the menubar app:

```bash
pnpm --filter @tanky/menubar-macos dev
```

### Package usage

```bash
npx tanky best --lat 41.39 --lon 2.17 --fuel gasoline95
```

If installed globally, use:

```bash
tanky best --lat 41.39 --lon 2.17 --fuel gasoline95
```

## CLI Usage

Tanky exposes two commands:

- `tanky best`
- `tanky near`

### Find cheapest fuel

```bash
tanky best --lat 41.39 --lon 2.17 --fuel gasoline95 --radius 5
```

Returns the cheapest station for the selected fuel type inside the search radius.

Supported options:

- `--lat <number>` required
- `--lon <number>` required
- `--radius <number>` default: `5`
- `--fuel <fuelType>` default: `gasoline95`
- `--limit <number>` default: `10`
- `--json`

### Find nearby stations

```bash
tanky near --lat 41.39 --lon 2.17 --radius 5 --limit 10 --fuel diesel
```

Returns nearby stations ordered by distance or price.

Supported options:

- `--lat <number>` required
- `--lon <number>` required
- `--radius <number>` default: `5`
- `--fuel <fuelType>` default: `gasoline95`
- `--sort <distance|price>` default: `distance`
- `--limit <number>` default: `10`
- `--json`

Validation includes positive `radius`/`limit` and supported fuel types.

## CLI Output

Tanky outputs Markdown by default.

Example:

```md
### 1. PETROPRIX
- Price: 1.519 EUR
- Fuel: gasoline95
- Distance (km): 2.28
- Address: CALLE BADAJOZ, 108
```

Use JSON mode for machine consumption:

```bash
--json
```

When `--json` is provided, Tanky prints a JSON array of normalized `GasStation` objects with no extra text.

## SDK Usage

```ts
import { getBestPrice, registerProvider } from "@tanky/core";
import { createSpainProvider } from "@tanky/provider-es";

registerProvider(createSpainProvider());

const result = await getBestPrice({
  country: "ES",
  location: { lat: 41.39, lon: 2.17 },
  fuelType: "gasoline95",
  radiusKm: 5,
});
```

## Architecture

Tanky uses a provider-based monorepo architecture:

```text
apps/
  cli/
  menubar-macos/

packages/
  core/
  provider-es/
  types/
```

- `@tanky/types`: shared domain types (`FuelType`, `GasStation`, `FuelProvider`, etc.)
- `@tanky/core`: provider registry, distance/radius logic, sorting, and SDK API (`searchStations`, `getBestPrice`, `getNearestStations`)
- `@tanky/provider-es`: Spain provider implementation (fetch + normalize)
- `@tanky/cli`: command-line interface built with Commander
- `@tanky/menubar-macos`: macOS menubar desktop app using Tauri 2 + React

## Desktop App

The first desktop app lives at `apps/menubar-macos`.

- Menubar icon + popup panel
- Best price tab
- Nearby stations tab
- Settings tab (location, fuel type, radius)
- Uses shared logic from `@tanky/core` and `@tanky/provider-es` (no duplicated business logic)

See [apps/menubar-macos/README.md](apps/menubar-macos/README.md) for app-specific setup and details.

## Data Sources

Current Spain provider dataset:

- https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/

## Development

```bash
pnpm install
pnpm build
pnpm dev
pnpm test
```

## License

MIT
