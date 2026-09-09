'use strict';
/**
 * Restore after close — Start Menu / taskbar must not hit a lock with no window.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { restoreOrCreateWindow } = require('./desktop-restore.cjs');

test('restoreOrCreateWindow: missing window creates one', () => {
    let created = 0;
    const result = restoreOrCreateWindow(null, { create: () => { created += 1; } });
    assert.equal(result, 'created');
    assert.equal(created, 1);
});

test('restoreOrCreateWindow: destroyed window creates one', () => {
    let created = 0;
    const win = { isDestroyed: () => true };
    const result = restoreOrCreateWindow(win, { create: () => { created += 1; } });
    assert.equal(result, 'created');
    assert.equal(created, 1);
});

test('restoreOrCreateWindow: live minimized window is restored and shown', () => {
    const calls = [];
    const win = {
        isDestroyed: () => false,
        isMinimized: () => true,
        restore: () => calls.push('restore'),
        show: () => calls.push('show'),
        focus: () => calls.push('focus'),
    };
    const result = restoreOrCreateWindow(win, { create: () => { throw new Error('must not create'); } });
    assert.equal(result, 'shown');
    assert.deepEqual(calls, ['restore', 'show', 'focus']);
});

test('restoreOrCreateWindow: live hidden window is shown without create', () => {
    const calls = [];
    const win = {
        isDestroyed: () => false,
        isMinimized: () => false,
        restore: () => calls.push('restore'),
        show: () => calls.push('show'),
        focus: () => calls.push('focus'),
    };
    const result = restoreOrCreateWindow(win, { create: () => { throw new Error('must not create'); } });
    assert.equal(result, 'shown');
    assert.deepEqual(calls, ['show', 'focus']);
});
