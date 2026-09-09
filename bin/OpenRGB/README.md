# OpenRGB Binaries

Nightwolf starts this copy automatically. Do not brand it in the UI.

## Update

From the project root. OpenRGB is the only third-party binary bundle (`bin/OpenRGB/`). Electron, `openrgb-sdk`, and the rest of the app update via npm — there is no packaged `.exe` auto-update yet.

Default (OpenRGB + npm trees):

```
npm run update
```

Inventory only (no download, no `npm update`):

```
npm run update -- --dry-run
```

OpenRGB binary only, or npm trees only:

```
npm run update:bundles
npm run update:app
```

Pin an OpenRGB Codeberg tag:

```
npm run update -- --tag release_candidate_1.0rc3.1
```

Low-level OpenRGB command (same download as `update:bundles`):

```
npm run openrgb:update
npm run openrgb:update -- --tag release_candidate_1.0rc3.1
```

Writes `OpenRGB.exe`, DLLs, and `VERSION.json` here. Binaries stay gitignored.

Source: https://codeberg.org/OpenRGB/OpenRGB/releases

## Auto-start

Set `AUTO_START_OPENRGB=true` in `backend/.env`.
