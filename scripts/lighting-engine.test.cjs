const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createLightingEngine } = require('./lighting-engine.cjs');

test('engine starts enabled with no scene', () => {
    const engine = createLightingEngine();
    assert.deepEqual(engine.status(), { enabled: true, activeSceneId: null });
});

test('disable clears the active scene and blocks control', () => {
    const engine = createLightingEngine();
    engine.applyScene('noite');
    const off = engine.setEnabled(false);
    assert.equal(off.enabled, false);
    assert.equal(off.activeSceneId, null);
    assert.throws(() => engine.assertEnabled(), { code: 'ENGINE_OFF' });
    assert.throws(() => engine.applyScene('noite'), { code: 'ENGINE_OFF' });
});

test('applying the same scene again turns that scene off', () => {
    const engine = createLightingEngine();
    const on = engine.applyScene('stream');
    assert.equal(on.activeSceneId, 'stream');
    assert.equal(on.toggledOff, false);
    const off = engine.applyScene('stream');
    assert.equal(off.activeSceneId, null);
    assert.equal(off.toggledOff, true);
    assert.equal(engine.isEnabled(), true);
});

test('applying a different scene replaces the active one', () => {
    const engine = createLightingEngine();
    engine.applyScene('a');
    const next = engine.applyScene('b');
    assert.equal(next.activeSceneId, 'b');
    assert.equal(next.toggledOff, false);
});

test('enable after disable allows scenes again', () => {
    const engine = createLightingEngine();
    engine.setEnabled(false);
    engine.setEnabled(true);
    const on = engine.applyScene('volta');
    assert.equal(on.enabled, true);
    assert.equal(on.activeSceneId, 'volta');
});
