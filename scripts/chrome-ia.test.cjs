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
