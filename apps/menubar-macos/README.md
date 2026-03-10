# Tanky Menubar (macOS)

Desktop menubar app built with Tauri 2, React, and TypeScript.

## Prerequisites

- Node.js 22+
- pnpm
- Rust toolchain (`cargo` + `rustc`)
- macOS (for tray/panel behavior)

## Run

From repo root:

```bash
pnpm install
pnpm --filter @tanky/menubar-macos dev
```

Build frontend bundle:

```bash
pnpm --filter @tanky/menubar-macos build
```

## Features

- Shows an icon in the macOS menubar
- Opens a popup panel when clicking the tray icon
- Provides tabs for:
  - Best nearby station
  - Nearby stations list
  - Settings
- Supports manual refresh from the UI and tray menu
- Supports quit from tray menu

## Data and Logic

This app reuses shared workspace packages:

- `@tanky/core`
- `@tanky/provider-es`

The app reuses shared workspace packages for domain logic rather than duplicating it.

Default configuration:

- latitude: `41.39`
- longitude: `2.17`
- fuelType: `gasoline95`
- radiusKm: `5`

Config can be edited in the Settings tab and is persisted in local storage.

## Tray + Popup

- Tray icon and menu are configured in `src-tauri/src/lib.rs`
- Panel behavior (show/hide/position) is implemented in `src-tauri/src/panel.rs`
- Popup height is content-driven with a monitor-based max cap and inner content scrolling when needed
