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

## What It Does

- Shows an icon in the macOS menubar
- Opens a popup panel when clicking the tray icon
- Provides tabs for:
  - Best nearby station
  - Nearby stations list
  - Settings
- Supports manual refresh from the UI and tray menu
- Supports quit from tray menu

## Data + Logic

This app reuses shared workspace packages:

- `@tanky/core`
- `@tanky/provider-es`

No fuel business logic is duplicated in the app.

Current hardcoded/default config is:

- latitude: `41.39`
- longitude: `2.17`
- fuelType: `gasoline95`
- radiusKm: `5`

Config can be edited in the Settings tab and is persisted in local storage.

## Tray + Popup

- Tray icon and menu are configured in `src-tauri/src/lib.rs`
- Panel behavior (show/hide/position) is implemented in `src-tauri/src/panel.rs`
- Popup height is content-driven with a monitor-based max cap and inner content scrolling when needed
