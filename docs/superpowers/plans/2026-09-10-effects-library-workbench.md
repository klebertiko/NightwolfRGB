# Effects + Library Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Discover + Biblioteca marketplace chrome with one master–detail lighting-console workbench: UI preview on select, hardware on Apply, honest live state, design-token chrome.

**Architecture:** Pure selection/live helpers + shared `EffectWorkbench` shell; `EffectsPanel` and `LibraryView` become thin data adapters. `EffectPreview` binds to **selected** id (always animate when selected) and uses `isLive` for intensity. Chrome IA source tests flip from marketplace-stage markers to workbench markers.

**Tech Stack:** React 19 + Vite frontend, Express effects APIs via existing hooks, `node:test` static IA gates in `scripts/chrome-ia.test.cjs`, tokens in `frontend/src/index.css` + root `design.md`.

**Spec:** `docs/superpowers/specs/2026-09-10-effects-library-workbench-design.md`

## Global Constraints

- Locked tokens from root `design.md` (graphite / ink / `--live`, Syne + Plex, no pill nav in these views).
- No Signal branding, no fake Free/Bundles CDN, no stolen photography.
- Preview mode C: select → UI only; Apply → hardware + `nw-installed-library`.
- Canvas R11 out of scope; keep `CanvasLayoutMap` reachable from `canvas-wave` inspector only.
- Do not delete production routes/tabs; in-place / additive only.
- Commit only when HITL explicitly asks (gauntlet WIP); skip commit steps otherwise.
- PowerShell: use `;`, not `&&`.
- Node on PATH: `C:\Users\klebe\.vfox\cache\nodejs\v-24.19.0\nodejs-24.19.0` if needed.

## File map

| File | Responsibility |
|------|----------------|
| `frontend/src/lib/effectWorkbenchState.ts` | Pure selected/live labels + apply/stop decision helpers (test seam) |
| `scripts/effect-workbench-state.test.cjs` | Node tests for that seam |
| `frontend/src/components/EffectWorkbench.tsx` | Shared master–detail shell UI |
| `frontend/src/components/EffectsPanel.tsx` | Discover adapter: Direct+OpenRGB catalog → workbench |
| `frontend/src/components/LibraryView.tsx` | Biblioteca adapter: installed entries → workbench |
| `frontend/src/App.tsx` | Move/fix `EffectPreview` so it previews **selected** |
| `frontend/src/components/EffectThumb.tsx` | Compact row thumb variant if missing |
| `frontend/src/components/IconRail.tsx` | Square token pass if still pill-like |
| `frontend/src/index.css` | `.nw-workbench-*` classes; drop reliance on marketplace spotlight CSS for these views |
| `scripts/chrome-ia.test.cjs` | Assert master–detail markers; remove marketplace-stage requirements |

---

### Task 1: Pure workbench state seam

**Files:**
- Create: `frontend/src/lib/effectWorkbenchState.ts`
- Create: `scripts/effect-workbench-state.test.cjs`
- Modify: `package.json` — add `scripts/effect-workbench-state.test.cjs` to `test:ci` and optionally `test:chrome-ia` companion script

**Interfaces:**
- Consumes: nothing
- Produces:
  - `liveChipLabel(activeEffect: string | null, selectedId: string | null, resolveName: (id: string) => string): string | null`
  - `isLive(activeEffect: string | null, selectedId: string | null): boolean`
  - `previewEffectId(selectedId: string | null): string | null` — id passed to UI preview
  - `shouldStartOnApply(selectedId: string | null): selectedId is string` — false for null; `custom` returns true for “open builder” flag via separate helper
  - `customNeedsBuilder(selectedId: string | null): boolean` — true when `selectedId === 'custom'`

- [ ] **Step 1: Write the failing test**

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = fs.readFileSync(
  path.join(__dirname, '../frontend/src/lib/effectWorkbenchState.ts'),
  'utf8',
);

// Mirror exported logic in the test file OR compile — prefer duplicating the pure
// functions in .cjs by requiring a tiny .cjs twin. Simplest Nightwolf pattern:
// assert source exports exist, then implement identical pure fns in the test file
// that must stay in sync — BETTER: put pure logic in effectWorkbenchState.cjs
// re-exported from .ts. Prefer .ts only + assert via copied expected table after
// implementing. For TDD red: assert.file exists fails first.

test('effectWorkbenchState module exists', () => {
  assert.ok(
    fs.existsSync(path.join(__dirname, '../frontend/src/lib/effectWorkbenchState.ts')),
  );
});

test('live chip uses active name, not selected-only', () => {
  // After module exists, either dynamic import via ts-node (not in repo) or
  // implement pure helpers in effectWorkbenchState.cjs for node:test.
});
```

Prefer a **`.cjs` implementation of the pure helpers** that TypeScript re-exports, matching `canvas-layout.cjs` style:

- Create `scripts/effect-workbench-state.cjs` with the functions
- Create `frontend/src/lib/effectWorkbenchState.ts` as thin typed wrappers that duplicate the same logic (keep identical) **OR** have tests only hit the `.cjs` and TS copy the signatures.

Canonical Nightwolf pattern: put logic in `scripts/effect-workbench-state.cjs`, test it, and duplicate the small pure functions in `frontend/src/lib/effectWorkbenchState.ts` (same bodies) — document “keep in sync” in a one-line comment.

Write `scripts/effect-workbench-state.test.cjs`:

```js
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isLive,
  liveChipLabel,
  previewEffectId,
  customNeedsBuilder,
} = require('./effect-workbench-state.cjs');

const name = (id) => ({ breathing: 'Respirar', strobing: 'Estrobo', custom: 'Sequência' }[id] || id);

test('isLive true only when active equals selected', () => {
  assert.equal(isLive('strobing', 'strobing'), true);
  assert.equal(isLive('strobing', 'breathing'), false);
  assert.equal(isLive(null, 'breathing'), false);
});

test('liveChipLabel null when nothing active; else active name', () => {
  assert.equal(liveChipLabel(null, 'breathing', name), null);
  assert.equal(liveChipLabel('strobing', 'breathing', name), 'Estrobo');
  assert.equal(liveChipLabel('strobing', 'strobing', name), 'Estrobo');
});

test('previewEffectId is selected only', () => {
  assert.equal(previewEffectId('rainbow'), 'rainbow');
  assert.equal(previewEffectId(null), null);
});

test('customNeedsBuilder', () => {
  assert.equal(customNeedsBuilder('custom'), true);
  assert.equal(customNeedsBuilder('strobing'), false);
  assert.equal(customNeedsBuilder(null), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/effect-workbench-state.test.cjs`  
Expected: FAIL (module missing / cannot require)

- [ ] **Step 3: Write minimal implementation**

`scripts/effect-workbench-state.cjs`:

```js
'use strict';

function isLive(activeEffect, selectedId) {
  return Boolean(activeEffect && selectedId && activeEffect === selectedId);
}

function liveChipLabel(activeEffect, selectedId, resolveName) {
  if (!activeEffect) return null;
  return resolveName(activeEffect);
}

function previewEffectId(selectedId) {
  return selectedId || null;
}

function customNeedsBuilder(selectedId) {
  return selectedId === 'custom';
}

module.exports = { isLive, liveChipLabel, previewEffectId, customNeedsBuilder };
```

`frontend/src/lib/effectWorkbenchState.ts` — same four functions, typed, with comment `// keep in sync with scripts/effect-workbench-state.cjs`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/effect-workbench-state.test.cjs`  
Expected: PASS

- [ ] **Step 5: Wire into `test:ci`**

In `package.json` `test:ci`, insert `scripts/effect-workbench-state.test.cjs` next to `chrome-ia.test.cjs`.

- [ ] **Step 6: Commit only if HITL asks**

```bash
git add scripts/effect-workbench-state.cjs scripts/effect-workbench-state.test.cjs frontend/src/lib/effectWorkbenchState.ts package.json
git commit -m "test(effects): add workbench selected-vs-live state seam"
```

---

### Task 2: RED — rewrite Chrome IA for master–detail

**Files:**
- Modify: `scripts/chrome-ia.test.cjs` (Discover + Biblioteca tests)
- Test: same file

**Interfaces:**
- Consumes: future markers from Task 3–5
- Produces: failing suite that defines the IA contract

- [ ] **Step 1: Replace marketplace Discover assertions with workbench contract**

In the test currently titled roughly `effects panel is Discover browse with search and cards…`, replace marketplace-stage / spotlight / library-rail / Ver tudo requirements with:

```js
test('effects panel is master-detail workbench with search and apply', () => {
  const src = effectsPanel();
  const css = indexCss();
  assert.ok(src.includes('data-testid="discover-effects"'), 'Discover root marker');
  assert.ok(src.includes('data-testid="discover-search"'), 'search field');
  assert.ok(src.includes('data-testid="workbench-master"'), 'master list column');
  assert.ok(src.includes('data-testid="workbench-detail"'), 'detail inspector column');
  assert.ok(src.includes('data-testid="workbench-preview"'), 'UI preview well');
  assert.ok(src.includes('data-workbench-layout="master-detail"'), 'master-detail layout mark');
  assert.ok(/\bAplicar\b/.test(src), 'Apply in detail');
  assert.ok(/\bParar\b/.test(src) || /stopEffect/.test(src), 'Stop path present');
  assert.equal(src.includes('data-discover-layout="marketplace-stage"'), false);
  assert.equal(/SPOTLIGHT_IDS|spotlightCards/.test(src), false);
  assert.equal(src.includes('data-testid="discover-featured"'), false);
  assert.equal(/Detalhes/.test(src), false, 'no empty Detalhes CTA');
  assert.ok(src.includes('CanvasLayoutMap') || src.includes('canvas-wave'), 'canvas still reachable');
  assert.equal(src.includes('SignalRGB'), false);
  assert.equal(/download count|261k|Pro paywall/i.test(src), false);
  assert.ok(css.includes('.nw-workbench') || css.includes('nw-workbench-'), 'workbench CSS');
  assert.equal(/rounded-full/.test(src), false, 'no pill filters in Discover source');
});
```

- [ ] **Step 2: Update Biblioteca page assertions**

Keep `data-testid="library-page"`, search, filters, Aplicar, persistence. Remove requirements for `library-rail` / `library-view-all` / horizontal rails as the primary browse. Require:

```js
assert.ok(page.includes('data-testid="workbench-master"'));
assert.ok(page.includes('data-testid="workbench-detail"'));
assert.ok(page.includes('data-workbench-layout="master-detail"'));
assert.ok(page.includes('data-testid="library-search"'));
assert.ok(page.includes('data-testid="library-filters"'));
assert.equal(page.includes('data-testid="library-view-all"'), false);
```

Keep IconRail Biblioteca destination test unchanged (still valid).

- [ ] **Step 3: Run Chrome IA — expect RED**

Run: `npm run test:chrome-ia`  
Expected: FAIL on new workbench markers / leftover marketplace markers still in source

- [ ] **Step 4: Commit only if HITL asks** (`test(chrome-ia): require master-detail workbench markers`)

---

### Task 3: `EffectPreview` — preview on select

**Files:**
- Modify: `frontend/src/App.tsx` (`EffectPreview` + how it is passed)
- Modify: `frontend/src/components/EffectsPanel.tsx` props (selected id for preview)

**Interfaces:**
- Consumes: `previewEffectId` semantics from Task 1
- Produces: `EffectPreview` props `{ color, effect, isLive }` where animation runs when `effect` is non-null; `isLive` boosts opacity/intensity

- [ ] **Step 1: Change EffectPreview to animate whenever `effect` is set**

```tsx
const EffectPreview: React.FC<{ color: string; isLive: boolean; effect: string | null }> = ({
  color, isLive, effect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!effect) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 48;
      const barWidth = canvas.width / bars;
      const t = Date.now() / (isLive ? 320 : 520);
      for (let i = 0; i < bars; i++) {
        const phase = (i / bars) * Math.PI * 2;
        const wave = (Math.sin(t + phase) + 1) / 2;
        const h = 12 + wave * (canvas.height * (isLive ? 0.72 : 0.5));
        ctx.fillStyle = color;
        ctx.globalAlpha = isLive ? 0.9 : 0.45;
        ctx.fillRect(i * barWidth + 3, canvas.height - h, barWidth - 6, h);
      }
      animationId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationId);
  }, [effect, isLive, color]);

  return (
    <div className="h-full w-full bg-graphite-950/80 relative overflow-hidden" data-testid="effect-preview-canvas">
      {!effect && (
        <p className="absolute inset-0 flex items-center justify-center nw-meta text-ink-mute z-10">
          Selecione um efeito
        </p>
      )}
      {effect && !isLive && (
        <p className="absolute top-2 left-2 nw-meta text-ink-mute z-10">Prévia · UI</p>
      )}
      {isLive && (
        <p className="absolute top-2 left-2 nw-meta text-ember z-10">Ao vivo</p>
      )}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={1000} height={200} />
    </div>
  );
};
```

- [ ] **Step 2: Stop passing preview bound only to `activeEffect`**

Workbench (Task 4) will own selected id and render preview inside detail. Until then, either:
- Pass `visualizer` as render-prop ` (selectedId, isLive) => <EffectPreview … />`, or
- Move `EffectPreview` into `EffectWorkbench` and import color from props.

Prefer: **move preview into `EffectWorkbench`** and delete the `visualizer` prop from `EffectsPanel` once the shell lands. For this task, extract `EffectPreview` to `frontend/src/components/EffectPreview.tsx` so App and Workbench can import it.

- [ ] **Step 3: Manual check later with Task 5** — selecting a row animates preview without Apply

- [ ] **Step 4: Commit only if HITL asks**

---

### Task 4: Build `EffectWorkbench` shell

**Files:**
- Create: `frontend/src/components/EffectWorkbench.tsx`
- Modify: `frontend/src/index.css` — add `.nw-workbench`, `.nw-workbench-master`, `.nw-workbench-detail`, `.nw-workbench-row`, `.nw-workbench-row[data-selected="true"]`, `.nw-workbench-preview`
- Create/Modify: `frontend/src/components/EffectPreview.tsx` (from Task 3)

**Interfaces:**
- Consumes: `isLive`, `liveChipLabel`, `customNeedsBuilder` from `effectWorkbenchState.ts`; `EffectThumb`; `CustomEffectBuilder`; optional `CanvasLayoutMap`
- Produces: shared props contract:

```ts
export type WorkbenchItem = {
  id: string;
  name: string;
  source: 'direct' | 'openrgb';
  blurb?: string;
  thumbKind?: string;
  pluginName?: string;
};

export type EffectWorkbenchProps = {
  title: string;
  testIdRoot: string; // 'discover-effects' | 'library-page'
  items: WorkbenchItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeEffect: string | null;
  speed: number;
  onSpeed: (n: number) => void;
  currentColor: string;
  engineEnabled: boolean;
  effectsBusy?: boolean;
  searchSlot: React.ReactNode;
  filterSlot?: React.ReactNode;
  emptyMaster?: React.ReactNode;
  onApply: (id: string) => Promise<void>;
  onStop: () => Promise<void>;
  showBuilder: boolean;
  canvasSlot?: React.ReactNode;
  headerExtra?: React.ReactNode;
};
```

- [ ] **Step 1: Implement layout skeleton with required testids**

```tsx
<div
  data-testid={testIdRoot}
  data-workbench-layout="master-detail"
  className="nw-workbench flex h-full min-h-0"
>
  <aside data-testid="workbench-master" className="nw-workbench-master …">
    {searchSlot}
    {filterSlot}
    <ul className="…">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            data-workbench-row={item.id}
            data-selected={selectedId === item.id ? 'true' : 'false'}
            onClick={() => onSelect(item.id)}
            className="nw-workbench-row …"
          >
            {/* thumb + name + source meta */}
          </button>
        </li>
      ))}
    </ul>
    {items.length === 0 && emptyMaster}
  </aside>
  <section data-testid="workbench-detail" className="nw-workbench-detail …">
    <div data-testid="workbench-preview" className="nw-workbench-preview …">
      <EffectPreview
        color={currentColor}
        effect={selectedId}
        isLive={isLive(activeEffect, selectedId)}
      />
    </div>
    {/* title, live chip via liveChipLabel(activeEffect, selectedId, …) */}
    {/* speed range */}
    {/* Aplicar / Parar — square, min-h-9, nw-body; no rounded-full */}
    {showBuilder && <CustomEffectBuilder … />}
    {canvasSlot}
  </section>
</div>
```

Live chip text: only render when `liveChipLabel(...)` non-null; format `live · {label}`.

Apply button:
- If `customNeedsBuilder(selectedId)` and builder not yet shown: `onSelect` already selected — Apply should call `onApply` which adapters interpret as “focus builder” without `startEffect`, OR disable Aplicar and show builder with copy “Use Tocar na sequência”.
- Spec: Apply from Library on Sequência opens builder — `onApply('custom')` in Library adapter sets `showBuilder` / ensures selection; does **not** call `startEffect`.

Stop always calls `onStop` (active), never selected-only.

- [ ] **Step 2: CSS — square console, dense 1440 layout**

Master ~38–42% width; detail flex-1. Rows min-height 40px. Preview well min-height ~180px. No `rounded-full` in workbench classes. Use `rounded-sm` / hairline `border-ink/15`.

- [ ] **Step 3: Typecheck**

Run: `cd frontend; npx tsc --noEmit`  
Expected: PASS for new files (adapters may still fail until Task 5)

- [ ] **Step 4: Commit only if HITL asks**

---

### Task 5: Wire `EffectsPanel` as Discover adapter

**Files:**
- Modify: `frontend/src/components/EffectsPanel.tsx` (replace marketplace JSX with `EffectWorkbench`)
- Modify: `frontend/src/App.tsx` — drop `visualizer` prop; pass color/engine hooks only

**Interfaces:**
- Consumes: `EffectWorkbench`, `DIRECT_EFFECTS`, plugin list, `startEffect` / `stopEffect` / plugin start-stop
- Produces: Discover page satisfying Task 2 IA tests

- [ ] **Step 1: Map catalog to `WorkbenchItem[]`**

Filter by search query + category chips (`all` | `direct` | `openrgb`) as square chips in `filterSlot`. No Spotlight. No installed convenience rail on Discover (Biblioteca tab owns that — reduces confusion). If removing Discover installed rail conflicts with a remaining chrome-ia assert, update that assert in Task 2 (already removed rails).

- [ ] **Step 2: selected state + apply**

```ts
const [selectedId, setSelectedId] = useState<string | null>('breathing');
const [speed, setSpeed] = useState(50);

async function onApply(id: string) {
  if (customNeedsBuilder(id)) {
    setSelectedId('custom');
    return;
  }
  if (id.startsWith('plugin:') || items find openrgb) {
    await onStartPluginEffect?.(pluginName);
  } else {
    await startEffect(id, { speed, color: currentColor });
  }
  rememberInstalled(id);
}
```

Use existing `pluginLibraryId` helpers for plugin ids.

- [ ] **Step 3: Engine-off banner inside detail only** (not full-page opaque block)

- [ ] **Step 4: Canvas slot when `selectedId === 'canvas-wave' || activeEffect === 'canvas-wave'`**

Render `CanvasLayoutMap` below inspector actions (or replace preview well when user clicks “Mapa” — prefer toggle `showCanvas` local state, default false; button “Mapa” in detail).

- [ ] **Step 5: Run Chrome IA**

Run: `npm run test:chrome-ia`  
Expected: Discover half PASS; Library may still FAIL

- [ ] **Step 6: Commit only if HITL asks**

---

### Task 6: Wire `LibraryView` as Biblioteca adapter

**Files:**
- Modify: `frontend/src/components/LibraryView.tsx`

**Interfaces:**
- Consumes: same `EffectWorkbench`; `filterAndSortInstalledEntries`; speed state **with UI** (no hard-coded silent 50)
- Produces: Biblioteca IA test PASS

- [ ] **Step 1: Replace rails with workbench**

Master items = filtered/sorted installed entries mapped to `WorkbenchItem`.  
`filterSlot` = square Todos/Direct/OpenRGB/Ao vivo + sort Recentes/A–Z (single row — no duplicate panel chips). Keep `data-testid="library-filters"` and `library-search`. Remove `library-filters-panel` duplicate if it only repeated chips; if tests still require toggle, keep one disclosure but not duplicate chip sets.

- [ ] **Step 2: Apply / custom / speed**

```ts
const [speed, setSpeed] = useState(50); // now wired to workbench slider

async function onApply(id: string) {
  if (customNeedsBuilder(id)) {
    setSelectedId('custom');
    setShowBuilder(true);
    return;
  }
  // plugin vs direct…
  await startEffect(id, { speed, color: currentColor });
  rememberInstalled(id);
}
```

Empty master: “Nada na Biblioteca ainda — use Aplicar num efeito.” + button calling `onOpenDiscover`.

- [ ] **Step 3: Run full Chrome IA + workbench state tests**

Run: `node --test scripts/effect-workbench-state.test.cjs scripts/chrome-ia.test.cjs`  
Expected: PASS

- [ ] **Step 4: Commit only if HITL asks**

---

### Task 7: Shared chrome token pass + thumb row variant

**Files:**
- Modify: `frontend/src/components/IconRail.tsx` — ensure square cells / `--live` spine (already mostly correct; remove any `rounded-full`)
- Modify: `frontend/src/components/EffectThumb.tsx` — add `variant="row"` compact size for master list (~40×28)
- Modify: `frontend/src/index.css` — row thumb sizing; purge unused Discover spotlight rules only if nothing else references them (grep first; keep if landing docs use them)

- [ ] **Step 1: Grep for `nw-discover-card-spotlight` / `marketplace-stage`**

If only EffectsPanel referenced them, leave CSS dead for now (YAGNI delete) or delete in this task after grep clean.

- [ ] **Step 2: Row thumb + rail polish**

- [ ] **Step 3: Run `npm run test:type-roles` and `npm run test:chrome-ia`**

Expected: PASS

- [ ] **Step 4: Commit only if HITL asks**

---

### Task 8: Verification smoke

**Files:** none (manual + CI)

- [ ] **Step 1: Automated**

Run: `npm run test:ci`  
Expected: all green (or fix regressions in scope)

- [ ] **Step 2: Manual (`npm run dev`)**

1. Efeitos → select Estrobo → preview animates, hardware unchanged  
2. Aplicar → lights + Biblioteca remembers  
3. Select Respirar → chip still `live · Estrobo` until Apply  
4. Parar → clears live  
5. Biblioteca → search/filter/sort → Aplicar with non-50 speed from slider  
6. Sequência → builder in detail, Tocar starts, no silent no-op  
7. Canvas item → Mapa opens layout map  
8. Rail looks consistent with Studio

- [ ] **Step 3: Hallmark self-score** (Philosophy / Hierarchy / Restraint ≥ 4) before declaring UI done

- [ ] **Step 4: Refresh handoff** under `D:\Development\handoffs\` if pausing; update `gauntlet-signalrgb-progress.html` only if HITL wants scoreboard note on workbench

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Master–detail IA both views | 4, 5, 6 |
| Preview mode C | 1, 3, 4 |
| Honest live chip | 1, 4 |
| Remove Spotlight / Detalhes / fake dock preview | 2, 5 |
| Library speed + Sequência builder | 6 |
| Square tokens / no pills | 4, 7 |
| Canvas via inspector | 5 |
| Chrome IA + state tests | 1, 2, 8 |
| No Free/Bundles / no canvas R11 | Global |
| Shared IconRail pass | 7 |

## Placeholder / consistency self-review

- No TBD steps; pure state lives in `.cjs` + mirrored `.ts`.
- Testids stable: `workbench-master`, `workbench-detail`, `workbench-preview`, `data-workbench-layout="master-detail"`.
- `liveChipLabel` always resolves **active** id.
- Commit steps gated on HITL.
