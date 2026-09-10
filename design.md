# Nightwolf RGB — design system

Lighting console for a seated desktop operator. The window is the product. Live hardware light is the hero — not product photos, not a marketing splash, not a smart-home floor plan.

## Locked tokens

Do not rotate these. Catalog themes and generated palettes are suspended.

| Token | Value | Role |
|---|---|---|
| `--color-paper` / `graphite-900` | `#0c0b0a` | Recessed canvas |
| `graphite-800` | `#141210` | Elevated panel |
| `graphite-700` | `#1c1a17` | Hover / inset |
| `--ember` / `--live` | user wash, default `#c8e04a` | Accent follows the colour being painted — never a fixed orange |

| `ink` | `#f3ead8` | Primary text |
| Display | Syne, roman, weight not italic | Titles |
| Body | IBM Plex Sans | UI copy |
| Label | IBM Plex Mono, uppercase tracking | Chips, shortcuts, status |

Headings stay roman. Live device colours are data, not theme — they may be inline. Theme colour in components comes from named tokens, not raw hex.

`--live` is the current wash. The chrome (rail mark, focus, Pintar) tracks it. Default is sulfur `#c8e04a` until the operator picks another colour. Live device colours are data and may be inline.


## What we took from IoT control panels

Genre DNA from two Dribbble presentation pieces (living-room overlay + Novara hub). Extract rhythm only — do not reproduce signature choices.

- Three zones: rail | live hero + dense device rows | quick paint/scenes
- Hero as the room-state: PC chassis ghost on a live wash, with four honest status pills (link, count, brightness, mode)
- Device callouts as floating tiles on the chassis — not chandelier leader-lines, not a room photo
- Compact device rows with a live glow dot, not a monitoring table
- Circular brightness dial + segmented dots + preset swatches in the right island
- Active nav as a square row with a live-colour spine — no pill, no glow

## What we refused

- Room photography, chandelier leader-lines, vacuum/music widgets
- Cyan/teal or purple as the brand accent
- “Good evening, Name” chrome and avatar stacks
- Invented °C / kWh / humidity / air-quality
- Glassmorphism flood, iOS Home knobs, tablet bezels
- Pill-shaped nav, orange glow, fixed ember that ignores the hardware wash
- Emoji as icons; Lucide only

## App surfaces (IA)

Six rail tabs — Studio · Luz · Explorar · Efeitos · Biblioteca · Cenas.

| Tab | Role |
|---|---|
| Explorar (`discover`) | Honest catalog browse (featured + grid + detail rail). |
| Efeitos (`effects`) | Live console. Selection = UI preview; Apply = hardware. |
| Biblioteca (`library`) | Installed-only. Empty → CTA to Explorar. |

Locked decision: [docs/adr/0001-three-surface-effects-ia.md](docs/adr/0001-three-surface-effects-ia.md).

## Desktop interaction

- Master–detail on Luz; Studio is the glanceable mural
- Keyboard: `1–6` tabs, `Ctrl+K` palette, `Ctrl+S` save scene, `Esc` dismiss, `?` overlay
- Titlebar chrome: min-height ≥ 44px, `overflow-visible` on header and BrandMark wrapper
- Primary actions ≥ 36px tall; focus ring is `--live`
- Visible labels on dialogs; icon+text on the rail (not icon-only)
- `prefers-reduced-motion` already kills decorative timing

## Density

Desktop 1440×900. Spacing is dashboard-dense (8–24px), not marketing (48–96px).

---

## Typography

**Genre:** Dense, instrumental, zero-decoration. One voice. The type system is a lighting console, not a landing page.

**Three families. Never invent a fourth.**

| Family | Tailwind token | Role |
|---|---|---|
| Syne | `font-display` | Display titles only — roman, weight 700. Never buttons, chips, labels. |
| IBM Plex Sans | `font-sans` | Body, kickers, numerals — the default face for all UI copy. |
| IBM Plex Mono | `font-mono` | Meta only — machine-readable strings: status, kbd, connection chips, numeric units. If a string is a human label, it is Sans. |

**Five locked roles. No ad-hoc `text-[Npx]` or one-off tracking values.**

| Role | CSS class | Face | Size | Weight | Tracking | Line-h | Where |
|---|---|---|---|---|---|---|---|
| Display | `.nw-display` | Syne | 22–28px (titlebar 15px) | 700 | -0.03em | 1.3 | One page title per view. Empty-state title, page hero ("O PC agora"), dialog title. Never for buttons, chips, or section headings. |
| Body | `.nw-body` | Plex Sans | 13px | 400–500 | 0 | 1.5 | UI copy, nav rail labels, list rows, dialog inputs, button text, Buscar results. Default face. |
| Kicker | `.nw-kicker` | Plex Sans | 11px | 500 | 0.12em | 1.4 | Section headings: Pintar, Devices, Cenas, Efeitos islands. Uppercase. NOT mono. |
| Meta | `.nw-meta` | Plex Mono | 10px | 400–500 | 0.14em | 1.4 | Status bar, kbd hints, connection chips, numeric units (LED count, %). Uppercase. Machine-readable strings only. |
| Numeral | `.nw-num` | Plex Sans tabular-nums | 22–28px | 600 | 0 | 1 | Brightness value, large metric readouts. Plex Sans (not Syne — Syne numerals fight Plex tabular metrics). |

**Rules (non-negotiable):**

1. **Headings always roman.** No italic on any title, kicker, or display text.
2. **Mono is machine-only.** Status strings, kbd shortcuts, connection status, numeric units. If a string is human-readable prose or a UI label, use Sans.
3. **One tracking value per role.** The 0.18em / 0.22em / tracking-widest soup is eliminated. Roles define tracking; instances do not override it.
4. **Colours and font-family via named tokens only.** `font-display` / `font-sans` / `font-mono`, `text-ink` / `text-ink-mute` / `text-ink-dim` / `text-ember`. No raw hex or new Google font imports in components.
5. **`--live` default is `#ff4d8d`.** Do not revert to sulfur/orange. Accent follows the painted hardware colour at runtime.
6. **No fourth family.** `frontend/index.html` loads exactly Syne + IBM Plex Sans + IBM Plex Mono. Any design requiring a fourth family is a design error.

**Landing** (`docs/index.html`, GitHub Pages): same three families and the locked graphite / ink tokens. No Inter, Orbitron, or purple/cyan hologram.

- Macrostructure: Photographic. Genre: atmospheric. Tone: cinematic.
- Nav: lighting-console mast (IconRail identity) — full-bleed graphite bar, square cells, `--live` 1px bottom edge and left spine on the current item, icon+text Studio / Luz / Efeitos / Cenas. Not a pill. Mobile: square fader toggle opens a left rail popover. Footer: thin `site-foot` row — `Nightwolf RGB` + `MIT · OpenRGB · GitHub` (no hero echo, not Windows-only). No pre-footer “Código aberto / Fork” band (GitHub lives in the footer; clone/dev commands stay in docs).
- CTA is the install action: both mast and hero open the same native popover/sheet (PowerShell `irm | iex`, Git Bash `curl | bash`, código-fonte). Square console chip — inset graphite, ink type, 2px `--live` fader mark, hairline live edge. Hover tracks `--live`. Pressed is inset. No zip. No scroll-to-download band.
- Folds are real Studio / Luz / Efeitos / Cenas captures shown whole (1920×1080, `object-fit: contain`) inside a lit well — never cropped, never ken-burned. Hero and tour wells share one `--stage-inset` (no vw padding that thickens the smaller hero frame). Landing rhythm: hero → OpenRGB trust → cleanup → tour stops (copy then shot: Luz → Efeitos → Cenas). No motherboard, SKU, or capture-date on the landing.
- `--live` on the landing is driven by cursor X across `WASH_PRESETS` (`#c9897a` `#d45c5c` `#c4a35a` `#6f9e6a` `#4a7ea8` `#f3ead8`). A follow-spot and chrome glow track `--live`. Until the pointer moves, `--live` stays `#ff4d8d`.
- Motion: follow-spot (custom props only). Scroll: the well lifts (transform/opacity), not the screenshot. Text bands fade once (IntersectionObserver). In-page nav clicks fire a `--live` shutter. `prefers-reduced-motion` and coarse pointers kill the spot, view timelines, and shutter.
- Do not ship the 5-column feature strip, wash-chip hex row, or a magenta brick CTA.

**Self-score (pre-emit):**

| Axis | Score | Notes |
|---|---|---|
| Philosophy | 5 | Dense instrumental console — no marketing defaults adopted |
| Hierarchy | 5 | Display → Kicker → Body → Meta clearly differentiated; one title per view enforced |
| Execution | 4 | All five roles implemented in CSS and applied across every view; one edge case (Hotspot kind label at 11px) left as Tailwind `text-[11px]` — too small for Body but not a named role |
| Specificity | 5 | Exact px sizes, weights, tracking, and line-heights specified for every role |
| Restraint | 5 | Three families, five roles, zero new imports; Orbitron and fourth-family requests refused |
| Variety | 4 | Roles are structurally distinct (Display/Kicker/Body/Meta/Numeral); within a single view variety is intentional contrast, not decoration |
