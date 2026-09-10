# Effects + Library + Discover redesign

NightwolfRGB splits effects into **three rail destinations**: Explorar (Discover browse), Efeitos (live console), and Biblioteca (installed only). Selection drives UI-only preview; Apply drives hardware and the installed library. Locked product tokens stay in root `design.md` — this spec does not invent a second theme.

**Approved decisions:** Preview mode C (UI on select + hardware on Apply) · Scope B (Explorar + Efeitos + Biblioteca + shared chrome tokens) · **Approach: three surfaces** (HITL override of Approach 1 shared master–detail for Discover+Biblioteca, 2026-09-10).

## Problem

Collapsing Discover into Efeitos made browse and operate feel identical; Biblioteca empty state mirroring Direct catalog worsened the confusion. Operators expected a catalog surface distinct from the live console and from installed history — without Signal-style fake marketplace theater.

## Goals

1. Three distinct IA surfaces: Explorar / Efeitos / Biblioteca.
2. Discover (Explorar) better than Signal: honest catalog, procedural thumbs, featured from real Direct data, one-hop Aplicar + Abrir no console — no fake Free/CDN/ratings.
3. Honest selection vs live state; preview before Apply (UI only).
4. Every visible control either works or is removed/disabled with clear copy.
5. Align these views + shared rail/chips to locked tokens (square console chrome, no pill nav).

## Non-goals

- Canvas mapping rounds / JS LED sampling.
- Marketplace photography, invented download counts, or real CDN packs.
- Full redesign of Studio / Luz / Cenas beyond shortcut renumbering (1–6).
- Deleting production routes without a separate HITL confirmation.

## Information architecture

| Zone | Explorar (`discover`) | Efeitos (`effects`) | Biblioteca (`library`) |
|------|----------------------|---------------------|------------------------|
| Top | `.nw-display` “Explorar” | `.nw-display` “Efeitos” | `.nw-display` “Biblioteca” + empty CTA to Explorar |
| Body | Featured strip + card grid + sticky detail rail | Master–detail `EffectWorkbench` console | Installed-only workbench; no Direct mirror when empty |
| Primary CTAs | Aplicar · Abrir no console | Aplicar · Parar · builder/mapa | Aplicar · Parar |

**States**

- `selected` — local id per surface; drives UI preview only.
- `live` — `activeEffect === selectedId`; chip uses the **active** effect name.
- Apply → hardware start + `rememberInstalled`.
- Stop → always stops the **active** effect, even if selection moved.
- Explorar → Abrir no console opens Efeitos with `initialSelectedId`.

**Removed**

- Fake marketplace-stage / Free/Bundles CDN / stock photo spotlights.
- Horizontal “Ver tudo” rails as the main browse pattern.
- Detalhes CTA with no body.
- Biblioteca empty → Direct catalog fallback.

**Kept**

- App tabs Studio / Luz / Explorar / Efeitos / Biblioteca / Cenas.
- `canvas-wave` → “Mapa” in Efeitos inspector when relevant.
- Current effect/plugin APIs and `nw-installed-library` storage.
- Preview mode C; procedural thumbs only.

## Visual system

Stay inside root `design.md`:

- Graphite paper / elevated panels; ink text; `--live` accent.
- Syne only for the single page title; UI copy IBM Plex Sans; mono for machine meta only.
- Filters: square / soft `rounded-lg` chips — no `rounded-full` pills.
- Explorar: denser card grid + featured heroes (procedural `EffectThumb` spotlight/card) — calmer than Signal marketplace clutter.
- Efeitos / Biblioteca: master–detail workbench chrome.
- Primary actions ≥ 36px; focus ring `--live`.

## Preview behaviour (mode C)

1. Selecting updates UI preview; hardware unchanged until Apply.
2. Empty selection: empty well + “Selecione um efeito”.
3. Apply runs `startEffect` / plugin start; library remember fires.
4. No marketplace photo previews — honest procedural art only.

## Data flow

- `selectedId` is local to each surface (may diverge).
- `activeEffect` remains App/hook source of truth for hardware.
- Speed lives in the inspector slider.
- `custom` / Sequência: Apply focuses the builder; start only via builder “Tocar” / Apply.
- Engine off: banner + disabled CTAs.
- Apply failure: inline/toast with API message; keep selection and UI preview.

## Components (implementation boundaries)

| Action | Target |
|--------|--------|
| Add | `DiscoverView.tsx` (catalog browse — not EffectWorkbench) |
| Keep | `EffectWorkbench.tsx` for Efeitos + Biblioteca |
| Adjust | `EffectsPanel.tsx` (`initialSelectedId`), `LibraryView.tsx` (empty → Explorar only), `IconRail` / `App` / shortcuts 1–6 |
| CSS | `.nw-discover-*` + existing `.nw-workbench-*` |
| Tests | `scripts/chrome-ia.test.cjs` |

## Testing

1. Library filter/sort/remember behaviour unchanged for installed set.
2. Workbench: select ≠ live; Apply promotes; Stop clears live.
3. Chrome IA: three rail tabs; Discover featured+grid; no marketplace-stage; Biblioteca no Direct empty fallback.
4. Manual smoke: Explorar → preview → Aplicar → Biblioteca; Abrir no console → Efeitos; empty Biblioteca CTA → Explorar.

## Out of scope (carry from gauntlet)

- Fake Free/Paid/Bundles store backends.
- Stealing Signal effect photography.
- Canvas R11 until HITL picks accept R10 / JS sampling / force rounds.
- Committing app WIP unless HITL asks.

## Success criteria

- Operator can browse on Explorar, operate on Efeitos, and find applied effects in Biblioteca — three visually distinct surfaces.
- Discover feels clearer and more honest than Signal marketplace.
- Self-critique floor (Hallmark): Philosophy / Hierarchy / Restraint ≥ 4 before calling the UI done.
