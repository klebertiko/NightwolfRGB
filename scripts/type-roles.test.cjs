/**
 * type-roles.test.cjs — AC#3 + AC#4 for Story NW-12
 *
 * Observable contract (source-file level):
 *   AC#3 — .nw-display line-height >= 1.25 so Syne descenders clear the line box;
 *           empty-state title uses .nw-display; subtitle has >= 8 px top gap.
 *   AC#4 — Titlebar <header> has overflow-visible and min-height >= 44 px;
 *           BrandMark wrapper has overflow-visible so ember glow is not clipped.
 *
 * Run: node --test scripts/type-roles.test.cjs
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const css       = () => fs.readFileSync(path.join(ROOT, 'frontend/src/index.css'), 'utf8');
const dashboard = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/Dashboard.tsx'), 'utf8');
const titlebar  = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/Titlebar.tsx'), 'utf8');
const brandmark = () => fs.readFileSync(path.join(ROOT, 'frontend/src/components/BrandMark.tsx'), 'utf8');

// ─── AC#3: .nw-display line-height ───────────────────────────────────────────

test('AC#3 · .nw-display line-height >= 1.25 (Syne 700 descenders fit in line box)', () => {
    const src = css();
    const blockM = src.match(/\.nw-display\s*\{([^}]+)\}/s);
    assert.ok(blockM, '.nw-display rule must exist in frontend/src/index.css');
    const lhM = blockM[1].match(/line-height\s*:\s*([\d.]+)/);
    assert.ok(lhM, '.nw-display must declare a numeric line-height');
    const lh = parseFloat(lhM[1]);
    assert.ok(
        lh >= 1.25,
        `line-height: ${lh} — need >= 1.25 so the Syne 700 descender at 22 px (~4.6 px below baseline) stays inside the line box`,
    );
});

// ─── AC#3: empty-state ───────────────────────────────────────────────────────

test('AC#3 · empty-state title "Nada ligado ainda" carries .nw-display', () => {
    const src = dashboard();
    assert.ok(src.includes('Nada ligado ainda'), '"Nada ligado ainda" must appear in Dashboard.tsx');
    const lines = src.split('\n');
    const titleLine = lines.find((l) => l.includes('Nada ligado ainda'));
    assert.ok(titleLine, 'must find the line containing the empty-state title');
    assert.ok(
        titleLine.includes('nw-display'),
        `empty-state title line must carry .nw-display; got:\n  ${titleLine.trim()}`,
    );
});

test('AC#3 · empty-state subtitle has mt >= 8 px so Syne 22 px descender does not overlap subtitle text', () => {
    const src = dashboard();
    // Grab up to 400 chars after the title copy so we find the subtitle paragraph
    const idx = src.indexOf('Nada ligado ainda');
    assert.ok(idx !== -1, '"Nada ligado ainda" must exist in Dashboard.tsx');
    const after = src.slice(idx, idx + 400);
    const mtM = after.match(/\bmt-(\d+)\b/);
    assert.ok(mtM, 'subtitle paragraph after the empty-state title must carry a Tailwind mt-N class');
    const gapPx = parseInt(mtM[1], 10) * 4; // Tailwind default scale: 1 unit = 4 px
    assert.ok(
        gapPx >= 8,
        `mt-${mtM[1]} = ${gapPx} px — need mt-2 (8 px) or more to clear the Syne 22 px descender`,
    );
});

// ─── AC#4: Titlebar ───────────────────────────────────────────────────────────

test('AC#4 · Titlebar <header> has overflow-visible', () => {
    const src = titlebar();
    const tagM = src.match(/<header\b([^>]*)>/);
    assert.ok(tagM, 'Titlebar.tsx must contain a <header> element');
    assert.ok(
        tagM[1].includes('overflow-visible'),
        `Titlebar <header> must include overflow-visible; got attrs:\n  ${tagM[1].trim().slice(0, 160)}`,
    );
});

test('AC#4 · Titlebar <header> min-height >= 44 px (WCAG 2.1 AA touch target)', () => {
    const src = titlebar();
    const tagM = src.match(/<header\b([^>]*)>/);
    assert.ok(tagM, 'Titlebar.tsx must contain a <header> element');
    const attrs = tagM[1];
    // h-11 = 44 px, h-12 = 48 px, ... ; min-h-11, min-h-[44px], etc.
    const ok =
        /\bh-1[1-9]\b/.test(attrs)          ||  // h-11 … h-19
        /\bh-[2-9]\d\b/.test(attrs)         ||  // h-20+
        /\bmin-h-1[1-9]\b/.test(attrs)      ||  // min-h-11 … min-h-19
        /\bmin-h-\[4[4-9]px\]/.test(attrs)  ||  // min-h-[44px] … min-h-[49px]
        /\bmin-h-\[[5-9]\dpx\]/.test(attrs);    // min-h-[50px]+
    assert.ok(
        ok,
        `Titlebar header attrs do not yield min-height >= 44 px (need h-11 / min-h-11 / min-h-[44px]);\n  attrs: ${attrs.trim().slice(0, 160)}`,
    );
});

// ─── AC#4: BrandMark ─────────────────────────────────────────────────────────

test('AC#4 · BrandMark wrapper span has overflow-visible so the 18 px ember glow is not clipped', () => {
    const src = brandmark();
    // The outermost <span> must carry both overflow-visible and shadow-ember
    const spanM = src.match(/<span\b([^>]*)>/);
    assert.ok(spanM, 'BrandMark.tsx must have a <span> wrapper element');
    const attrs = spanM[1];
    assert.ok(
        attrs.includes('shadow-ember'),
        `BrandMark wrapper span must use shadow-ember; got: ${attrs.trim()}`,
    );
    assert.ok(
        attrs.includes('overflow-visible'),
        `BrandMark wrapper span must include overflow-visible; got: ${attrs.trim()}`,
    );
});
