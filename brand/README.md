# Brand — Nightwolf RGB

Edit here. Then run `npm run brand` from the project root. That copies the mark into the app, the window, and the Windows `.ico`. Do not edit the copies under `frontend/public/` or `electron/` by hand — they are generated.

## Files

| File | Role |
|---|---|
| `mark.svg` | Logo in the titlebar and favicon. Edit this to change the mark. |
| `icon.png` | Square raster for the Windows / Electron app icon. Replace this file to change the taskbar icon. |
| `mark-portrait.png` | Optional art. Not wired into the app. |
| `icon.ico` | Generated. Do not edit. |

## Update the logo

1. Change `mark.svg` (vector) and/or replace `icon.png` (taskbar).
2. `npm run brand`
3. Restart the desktop app so Windows picks up the new `.ico`.
4. Unpin Nightwolf from the taskbar and pin again — Windows caches the old Electron icon on an existing pin.

## Vendor / app updates

`npm run brand` only copies icons. It is not a vendor bundle.

To refresh OpenRGB (`bin/OpenRGB/`, the only binary bundle) and the three npm trees, use `npm run update` from the project root. See `bin/OpenRGB/README.md`. There is no packaged `.exe` auto-update yet.
