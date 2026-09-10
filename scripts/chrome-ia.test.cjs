/**
 * Chrome IA — one master Controle, connection is SDK (not wash color),
 * footer is readout-only.
 *
 * Run: node --test scripts/chrome-ia.test.cjs
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const titlebar = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/Titlebar.tsx'), 'utf8');
const status = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/StatusBar.tsx'), 'utf8');
const dashboard = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/Dashboard.tsx'), 'utf8');
const effectsPanel = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/EffectsPanel.tsx'), 'utf8');
const discoverView = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/DiscoverView.tsx'), 'utf8');
const libraryView = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/LibraryView.tsx'), 'utf8');
const iconRail = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/IconRail.tsx'), 'utf8');
const appTsx = () => fs.readFileSync(path.join(ROOT, 'frontend/src/App.tsx'), 'utf8');
const shortcutOverlay = () =>
    fs.readFileSync(path.join(ROOT, 'frontend/src/components/ShortcutOverlay.tsx'), 'utf8');
const installedLibrary = () =>
    fs.readFileSync(path.join(ROOT, 'frontend/src/lib/installedLibrary.ts'), 'utf8');
const effectThumb = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/EffectThumb.tsx'), 'utf8');
const effectWorkbench = () =>
    fs.readFileSync(path.join(ROOT, 'frontend/src/components/EffectWorkbench.tsx'), 'utf8');
const canvasLayoutMap = () =>
    fs.readFileSync(path.join(ROOT, 'frontend/src/components/CanvasLayoutMap.tsx'), 'utf8');
const indexCss = () => fs.readFileSync(path.join(ROOT, 'frontend/src/index.css'), 'utf8');

test('titlebar has exactly one Controle switch', () => {
    const src = titlebar();
    const matches = src.match(/label="Controle"/g) || [];
    assert.equal(matches.length, 1, 'Controle lives once, in the titlebar');
});

test('titlebar connection is SDK, not Ligado, and not painted with --live', () => {
    const src = titlebar();
    assert.equal(src.includes("'Ligado'"), false, 'Ligado collides with Controle and reads as lighting');
    assert.ok(src.includes("'SDK'") || src.includes('"SDK"') || src.includes('>SDK'), 'connection label is SDK');
    assert.equal(src.includes('bg-ember'), false, 'connection lamp must not use the wash color');
    assert.ok(src.includes('accent="power"'), 'Controle on-state must not follow the wash');
});

test('status bar has no effect or engine switches', () => {
    const src = status();
    assert.equal(src.includes('EffectSwitch'), false, 'footer must not host EffectSwitch');
    assert.equal(src.includes('label="Controle"'), false);
    assert.equal(src.includes('label="Efeitos"'), false);
});

test('dashboard connection chip says SDK, not Ligado', () => {
    const src = dashboard();
    assert.equal(/connected \? 'Ligado'/.test(src), false);
    assert.ok(/connected \? 'SDK'/.test(src), 'palco chip should name the SDK, not Ligado');
});

test('Explorar is catalog-browse Discover with featured grid and detail CTAs', () => {
    const src = discoverView();
    const rail = iconRail();
    const app = appTsx();
    const css = indexCss();
    assert.ok(rail.includes("'discover'") || rail.includes('"discover"'), 'AppTab includes discover');
    assert.ok(/label:\s*'Explorar'|label:\s*"Explorar"/.test(rail), 'IconRail labels Explorar');
    assert.ok(
        /id:\s*'discover'[\s\S]*id:\s*'effects'|id:\s*"discover"[\s\S]*id:\s*"effects"/.test(rail),
        'Explorar sits before Efeitos in the rail',
    );
    assert.ok(app.includes('DiscoverView'), 'App mounts DiscoverView');
    assert.ok(app.includes("'discover'") || app.includes('"discover"'), 'App TABS includes discover');
    assert.ok(
        src.includes('data-testid="discover-page"'),
        'Discover page root marker',
    );
    assert.ok(
        src.includes('data-discover-layout="catalog-browse"'),
        'catalog-browse layout (not marketplace-stage)',
    );
    assert.equal(src.includes('data-discover-layout="marketplace-stage"'), false);
    assert.ok(src.includes('data-testid="discover-featured"'), 'featured strip from real Direct data');
    assert.ok(src.includes('data-testid="discover-grid"'), 'card grid');
    assert.ok(src.includes('data-testid="discover-detail"'), 'sticky detail rail');
    assert.ok(src.includes('data-testid="discover-preview"'), 'UI preview well');
    assert.ok(src.includes('data-testid="discover-search"'), 'search field');
    assert.ok(src.includes('data-testid="discover-apply"'), 'Aplicar CTA');
    assert.ok(src.includes('data-testid="discover-open-console"'), 'Abrir no console CTA');
    assert.ok(/\bAplicar\b/.test(src), 'Apply copy');
    assert.ok(/Abrir no console/.test(src), 'open console copy');
    assert.equal(src.includes('EffectWorkbench'), false, 'Discover is not the workbench list shell');
    assert.equal(/SPOTLIGHT_IDS|spotlightCards/.test(src), false);
    assert.equal(/Detalhes/.test(src), false, 'no empty Detalhes CTA');
    assert.equal(src.includes('SignalRGB'), false);
    assert.equal(/download count|261k|Pro paywall|Free\/Bundles|Bundles CDN/i.test(src), false);
    assert.ok(css.includes('.nw-discover') || css.includes('nw-discover-'), 'discover CSS');
    assert.equal(/rounded-full/.test(src), false, 'no pill filters in Discover');
    assert.ok(/rounded-lg/.test(src), 'soft rounded-lg CTAs');
    const libSrc = installedLibrary();
    assert.ok(
        /INSTALLED_LIBRARY_KEY|localStorage|nw-installed-library/.test(libSrc) ||
            /INSTALLED_LIBRARY_KEY|localStorage|nw-installed-library/.test(src),
        'Biblioteca persists applied effect ids in localStorage (not a fake install CDN)',
    );
});

test('effects panel is master-detail workbench console with search and apply', () => {
    const src = effectsPanel();
    const shell = effectWorkbench();
    const css = indexCss();
    assert.ok(src.includes('EffectWorkbench'), 'Efeitos mounts shared workbench shell');
    assert.ok(
        src.includes('testIdRoot="effects-console"') || src.includes('data-testid="effects-console"'),
        'Efeitos console root marker',
    );
    assert.ok(src.includes('data-testid="effects-search"'), 'console search field');
    assert.ok(src.includes('initialSelectedId'), 'accepts seed from Explorar Abrir no console');
    assert.ok(shell.includes('data-testid="workbench-master"'), 'master list column');
    assert.ok(shell.includes('data-testid="workbench-detail"'), 'detail inspector column');
    assert.ok(shell.includes('data-testid="workbench-preview"'), 'UI preview well');
    assert.ok(shell.includes('data-workbench-layout="master-detail"'), 'master-detail layout mark');
    assert.ok(/\bAplicar\b/.test(shell) || /\bAplicar\b/.test(src), 'Apply in detail');
    assert.ok(/\bParar\b/.test(shell) || /stopEffect/.test(src), 'Stop path present');
    assert.equal(src.includes('data-discover-layout="marketplace-stage"'), false);
    assert.equal(/Detalhes/.test(src), false, 'no empty Detalhes CTA');
    assert.ok(src.includes('CanvasLayoutMap') || src.includes('canvas-wave'), 'canvas still reachable');
    assert.equal(src.includes('SignalRGB'), false);
    assert.equal(/download count|261k|Pro paywall/i.test(src), false);
    assert.ok(css.includes('.nw-workbench') || css.includes('nw-workbench-'), 'workbench CSS');
    assert.ok(/rounded-lg/.test(src) || /rounded-lg/.test(shell), 'Efeitos CTAs use soft rounded-lg (not pills)');
    assert.equal(/rounded-full/.test(src), false, 'no pill filters in Efeitos source');
});

test('IconRail has first-class Biblioteca destination separate from Explorar and Efeitos', () => {
    const rail = iconRail();
    const app = appTsx();
    const page = libraryView();
    const shell = effectWorkbench();
    const shortcuts = shortcutOverlay();
    assert.ok(rail.includes("'library'") || rail.includes('"library"'), 'AppTab includes library');
    assert.ok(/label:\s*'Biblioteca'|label:\s*"Biblioteca"/.test(rail), 'IconRail labels Biblioteca');
    assert.ok(rail.includes('nw-rail-item') || /rounded-sm/.test(rail), 'IconRail uses square console cells');
    assert.equal(/rounded-full/.test(rail), false, 'IconRail must not use pill nav');
    assert.equal(/rounded-xl/.test(rail), false, 'IconRail must not use marketplace rounded-xl');
    assert.ok(
        /id:\s*'effects'[\s\S]*id:\s*'library'|id:\s*"effects"[\s\S]*id:\s*"library"/.test(rail),
        'Biblioteca sits near Efeitos in the rail order',
    );
    assert.ok(app.includes("'library'") || app.includes('"library"'), 'App TABS includes library');
    assert.ok(app.includes('LibraryView') || app.includes('library-page'), 'App mounts Biblioteca view');
    assert.ok(/1–6/.test(shortcuts) || /1-6/.test(shortcuts), 'shortcuts document 1–6 tabs');
    assert.ok(/Explorar/.test(shortcuts), 'shortcut overlay names Explorar');
    assert.ok(
        page.includes('testIdRoot="library-page"') || page.includes('data-testid="library-page"'),
        'Biblioteca page root marker',
    );
    assert.ok(
        page.includes('destinationAttr') || page.includes('data-library-destination="true"'),
        'Biblioteca marks first-class library destination',
    );
    assert.ok(
        /Nada na Biblioteca ainda/.test(page),
        'Biblioteca keeps honest empty-library copy',
    );
    assert.ok(
        page.includes('data-testid="library-empty-banner"'),
        'empty Biblioteca shows banner',
    );
    assert.ok(
        page.includes('data-testid="library-open-discover"') || /Ir para Explorar/.test(page),
        'empty Biblioteca CTA goes to Explorar',
    );
    assert.equal(
        /browsingCatalog|catalogEntries/.test(page),
        false,
        'empty Biblioteca must not mirror Direct catalog',
    );
    assert.ok(/\bAplicar\b/.test(shell) || /\bAplicar\b/.test(page), 'Biblioteca cards expose Aplicar');
    assert.ok(
        /nw-installed-library|INSTALLED_LIBRARY_KEY|readInstalledLibrary/.test(page),
        'Biblioteca page reads the same installed persistence',
    );
    assert.ok(
        page.includes('data-testid="library-search"'),
        'Biblioteca has managed-library search field',
    );
    assert.ok(
        page.includes('data-testid="library-filters"'),
        'Biblioteca has honest filter chips when installed set is non-empty',
    );
    assert.ok(
        /availableLibraryFilters|filterAndSortInstalledEntries/.test(page) ||
            /Todos/.test(page),
        'Biblioteca filter UI includes Todos baseline chip',
    );
    assert.ok(page.includes('EffectWorkbench'), 'Biblioteca mounts workbench');
    assert.ok(shell.includes('data-testid="workbench-master"'), 'Biblioteca master column');
    assert.ok(shell.includes('data-testid="workbench-detail"'), 'Biblioteca detail column');
    assert.ok(shell.includes('data-workbench-layout="master-detail"'), 'Biblioteca master-detail');
    assert.equal(page.includes('data-testid="library-view-all"'), false);
});

test('EffectPreview motion differs by selected effect kind', () => {
    const src = fs.readFileSync(path.join(ROOT, 'frontend/src/components/EffectPreview.tsx'), 'utf8');
    assert.ok(src.includes('previewKindFromEffect'), 'maps effect id → preview kind');
    assert.ok(src.includes('data-preview-kind'), 'DOM exposes preview kind for asserts');
    assert.ok(src.includes('data-preview-effect'), 'DOM exposes selected effect id');
    for (const kind of ['static', 'breathing', 'strobing', 'rainbow', 'spectrum', 'canvas', 'custom', 'plugin']) {
        assert.ok(src.includes(`case '${kind}'`), `distinct paint branch for ${kind}`);
    }
    assert.ok(src.includes("effect === 'canvas-wave'"), 'canvas-wave maps to canvas preview');
    assert.ok(src.includes("startsWith('plugin:')"), 'plugin ids get plugin preview');
});

test('Discover thumbs are cinematic full-bleed scenes, not empty color swatches', () => {
    const src = effectThumb();
    assert.ok(src.includes('data-thumb-pattern="representational"'), 'thumbs mark representational pattern');
    assert.ok(src.includes('data-thumb-cinematic="full-bleed"'), 'thumbs mark cinematic full-bleed art');
    assert.ok(src.includes('variant') || src.includes('ThumbVariant'), 'spotlight/card variant support');
    assert.ok(src.includes('nw-thumb-svg'), 'SVG scene markup');
    assert.ok(
        src.includes('viewBox="0 0 480 270"') || src.includes('viewBox="0 0 320 180"'),
        'cinematic scene viewBox, not tiny glyph dock',
    );
    for (const kind of ['static', 'breathing', 'strobing', 'rainbow', 'spectrum', 'canvas', 'custom', 'plugin']) {
        assert.ok(src.includes(`kind === '${kind}'`), `pattern branch for ${kind}`);
    }
    assert.ok(
        src.includes('nw-thumb-lightning') || src.includes('nw-thumb-nebula') || src.includes('nw-thumb-aurora'),
        'atmospheric key-art markers (storm/nebula/aurora) — not schematic glyph docks',
    );
    assert.ok(
        src.includes('nw-thumb-ember') || src.includes('nw-thumb-flame') || src.includes('nw-thumb-wave-band'),
        'heat/fire/ocean atmosphere — not bare fill',
    );
    assert.equal(/background:\s*var\(--thumb-color\)\s*;/.test(src), false, 'no solid --thumb-color swatch body');
});

test('canvas device cells are transparent samplers, not opaque graphite fills', () => {
    const src = canvasLayoutMap();
    const css = indexCss();
    assert.ok(src.includes('nw-canvas-device-cell'), 'device cell marker class');
    assert.ok(src.includes('bg-transparent'), 'device buttons declare transparent fill');
    assert.equal(
        /bg-graphite-900/.test(src),
        false,
        'no opaque graphite fill over the effect field',
    );
    assert.equal(
        /bg-ember\/\d+/.test(src),
        false,
        'selection must not paint an opaque ember wash over the field',
    );
    assert.ok(css.includes('.nw-canvas-device-cell'), 'CSS locks device cells to transparent');
    assert.ok(
        /background-color:\s*transparent/.test(css),
        'CSS forces transparent background so the field shows through',
    );
});

test('canvas device cells render per-LED sample markers on the continuous field', () => {
    const src = canvasLayoutMap();
    const css = indexCss();
    const mapper = fs.readFileSync(
        path.join(ROOT, 'frontend/src/lib/ledCanvasPoint.ts'),
        'utf8',
    );
    assert.ok(src.includes('data-led-sample'), 'LED sample markers are marked for asserts');
    assert.ok(src.includes('ledSampleMarkers'), 'markers come from the shared LED grid mapper');
    assert.ok(src.includes('nw-canvas-led-sample'), 'LED sample CSS class wired');
    assert.ok(mapper.includes('ledCanvasPoint'), 'frontend mapper exports ledCanvasPoint');
    assert.ok(mapper.includes('ledSampleMarkersFromMatrix'), 'matrix-aware marker path exists');
    assert.ok(mapper.includes('ledNormFromZones'), 'OpenRGB zone.matrix → normalized LED coords');
    assert.ok(mapper.includes('ledMatrixGridFromZones'), 'matrix topology grid for cell-tiled silhouette');
    assert.ok(mapper.includes('MAX_MATRIX_TOPOLOGY_CELLS'), 'matrix soft-cap distinct from lattice 64');
    assert.ok(/matrix/i.test(mapper), 'mapper mentions matrix topology');
    assert.ok(mapper.includes('MAX_LED_SAMPLE_MARKERS'), 'density cap for huge LED counts');
    assert.ok(css.includes('.nw-canvas-led-sample'), 'CSS styles LED sample stars');
    assert.ok(css.includes('clip-path'), 'markers are star/cross shaped, not opaque boxes');
});

test('canvas matrix devices tile cells with structural null voids', () => {
    const src = canvasLayoutMap();
    const css = indexCss();
    const mapper = fs.readFileSync(
        path.join(ROOT, 'frontend/src/lib/ledCanvasPoint.ts'),
        'utf8',
    );
    assert.ok(src.includes('data-led-matrix-grid'), 'matrix grid marked for asserts');
    assert.ok(src.includes('data-led-matrix-cell'), 'per-cell marker present');
    assert.ok(src.includes('data-led-matrix-void'), 'null cells marked as structural voids');
    assert.ok(src.includes('ledMatrixGridFromZones'), 'canvas uses matrix grid when zones provide matrix');
    assert.ok(src.includes('nw-canvas-led-matrix'), 'matrix grid CSS class wired');
    assert.ok(css.includes('.nw-canvas-led-matrix-void'), 'void cells have dark blocker structural style');
    assert.ok(css.includes('.nw-canvas-led-matrix-lit'), 'lit cells form tiled silhouette');
    {
        const voidBlock = css.slice(
            css.indexOf('.nw-canvas-led-matrix-void'),
            css.indexOf('.nw-canvas-led-matrix-lit'),
        );
        assert.ok(
            /background-color:\s*#0c0b0a/.test(voidBlock) ||
                /background-color:\s*#141210/.test(voidBlock),
            'voids are opaque near-black graphite blockers (not transparent field windows)',
        );
        assert.ok(
            !/background(?:-color)?:\s*transparent/.test(voidBlock),
            'voids must not be transparent — they punch dark silhouette channels',
        );
    }
    assert.ok(
        !src.includes('nw-canvas-led-sample--in-cell'),
        'matrix lit tiles are fill-primary — no nested star clutter inside cells',
    );
    {
        const litBlock = css.slice(
            css.indexOf('.nw-canvas-led-matrix-lit'),
            css.indexOf('.nw-canvas-led-sample'),
        );
        assert.ok(
            /background-color:\s*transparent/.test(litBlock),
            'lit cells are field-revealing windows (transparent fill, not opaque slabs)',
        );
        assert.ok(
            !/color-mix\(in srgb,\s*var\(--ember\)/.test(litBlock),
            'lit cells must not assert heavy ember color-mix as primary fill',
        );
        assert.ok(
            !/mix-blend-mode:\s*screen/.test(litBlock),
            'lit cells must not screen-blend a full ember wash over the field',
        );
    }
    assert.ok(
        /MAX_MATRIX_TOPOLOGY_CELLS\s*=\s*400/.test(mapper),
        'matrix path soft-caps at 400, not lattice 64',
    );
    assert.ok(
        !/ledSampleMarkersFromMatrix\([^)]*MAX_LED_SAMPLE_MARKERS/.test(mapper) ||
            mapper.includes('maxMarkers = MAX_MATRIX_TOPOLOGY_CELLS'),
        'matrix markers default soft-cap is topology budget, not 64',
    );
});