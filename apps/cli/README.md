# @tanky/cli

CLI to retrieve nearby fuel prices from public datasets.

## Install

```bash
npm i -g @tanky/cli
```

Or use with npx:

```bash
npx @tanky/cli best --lat 41.39 --lon 2.17 --fuel gasoline95
```

## Commands

### `tanky best`

Find the cheapest station for a fuel type near a location.

```bash
tanky best --lat 41.39 --lon 2.17 --fuel gasoline95 --radius 5
```

Options:

- `--lat <number>` required
- `--lon <number>` required
- `--radius <number>` default: `5`
- `--fuel <fuelType>` default: `gasoline95`
- `--limit <number>` default: `10`
- `--country <country>` default: `ES`
- `--json`

### `tanky near`

Find nearby stations with sorting.

```bash
tanky near --lat 41.39 --lon 2.17 --radius 5 --sort distance --limit 10
```

Options:

- `--lat <number>` required
- `--lon <number>` required
- `--radius <number>` default: `5`
- `--fuel <fuelType>` default: `gasoline95`
- `--sort <distance|price>` default: `distance`
- `--limit <number>` default: `10`
- `--country <country>` default: `ES`
- `--json`

## Output

Default output is Markdown-like text.

Use `--json` to get machine-readable JSON.

## Monorepo

Repository: https://github.com/aleixalonso/tanky
