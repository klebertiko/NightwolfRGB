'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    resolveBootPlan,
    beginCloseQuit,
    resolveNodeExecutable,
    viteSpawn,
    backendSpawn,
} = require('./desktop-boot.cjs');

test('resolveBootPlan: packaged skips vite even if frontend closed', () => {
    assert.deepEqual(
        resolveBootPlan({ isDev: false, backendOpen: false, frontendOpen: false }),
        { startBackend: true, startFrontend: false },
    );
});

test('resolveBootPlan: dev starts vite when :5173 is down (reopen after quit)', () => {
    assert.deepEqual(
        resolveBootPlan({ isDev: true, backendOpen: true, frontendOpen: false }),
        { startBackend: false, startFrontend: true },
    );
});

test('resolveBootPlan: dev starts both when cold', () => {
    assert.deepEqual(
        resolveBootPlan({ isDev: true, backendOpen: false, frontendOpen: false }),
        { startBackend: true, startFrontend: true },
    );
});

test('resolveBootPlan: dev starts nothing when already warm', () => {
    assert.deepEqual(
        resolveBootPlan({ isDev: true, backendOpen: true, frontendOpen: true }),
        { startBackend: false, startFrontend: false },
    );
});

test('beginCloseQuit: initiateQuit before hide so second-instance cannot restore mid-quit', () => {
    const calls = [];
    const result = beginCloseQuit({
        quitting: false,
        initiateQuit: () => calls.push('quit'),
        hide: () => calls.push('hide'),
    });
    assert.equal(result, 'quit-started');
    assert.deepEqual(calls, ['quit', 'hide']);
});

test('beginCloseQuit: ignores when already quitting', () => {
    const calls = [];
    const result = beginCloseQuit({
        quitting: true,
        initiateQuit: () => calls.push('quit'),
        hide: () => calls.push('hide'),
    });
    assert.equal(result, 'ignored');
    assert.deepEqual(calls, []);
});

test('resolveNodeExecutable: outside Electron uses execPath as plain node', () => {
    const resolved = resolveNodeExecutable({
        electron: false,
        execPath: 'C:\\\\tools\\\\node.exe',
    });
    assert.deepEqual(resolved, { command: 'C:\\\\tools\\\\node.exe', asElectronNode: false });
});

test('resolveNodeExecutable: under Electron prefers PATH node.exe', () => {
    const resolved = resolveNodeExecutable({
        electron: true,
        execPath: 'C:\\\\Electron\\\\electron.exe',
        pathEnv: 'C:\\\\vfox\\\\nodejs',
        existsSync: (p) => p.replace(/\\/g, '/').endsWith('vfox/nodejs/node.exe'),
    });
    assert.equal(resolved.asElectronNode, false);
    assert.match(resolved.command.replace(/\\/g, '/'), /vfox\/nodejs\/node\.exe$/);
});

test('resolveNodeExecutable: Electron fallback uses execPath + asElectronNode', () => {
    const resolved = resolveNodeExecutable({
        electron: true,
        execPath: 'C:\\\\Electron\\\\electron.exe',
        pathEnv: '',
        nightwolfNode: null,
        existsSync: () => false,
    });
    assert.deepEqual(resolved, {
        command: 'C:\\\\Electron\\\\electron.exe',
        asElectronNode: true,
    });
});

test('viteSpawn: PATH node — no ELECTRON_RUN_AS_NODE', () => {
    const plan = viteSpawn('D:\\\\fake\\\\frontend', {
        resolveNode: () => ({ command: 'C:\\\\node.exe', asElectronNode: false }),
    });
    assert.equal(plan.command, 'C:\\\\node.exe');
    assert.equal(plan.options.shell, false);
    assert.equal(plan.options.env.ELECTRON_RUN_AS_NODE, undefined);
    assert.match(plan.args[0], /vite[\\/]+bin[\\/]+vite\.js$/);
});

test('viteSpawn: Electron-as-Node fallback sets ELECTRON_RUN_AS_NODE', () => {
    const plan = viteSpawn('D:\\\\fake\\\\frontend', {
        resolveNode: () => ({ command: 'C:\\\\electron.exe', asElectronNode: true }),
    });
    assert.equal(plan.options.env.ELECTRON_RUN_AS_NODE, '1');
});

test('backendSpawn: uses ts-node via resolved node (no npm.cmd)', () => {
    const plan = backendSpawn('D:\\\\fake\\\\backend', true, {
        resolveNode: () => ({ command: 'C:\\\\node.exe', asElectronNode: false }),
    });
    assert.equal(plan.command, 'C:\\\\node.exe');
    assert.equal(plan.options.shell, false);
    assert.match(plan.args[0], /ts-node[\\/]+dist[\\/]+bin\.js$/);
    assert.equal(plan.args[1], 'server.ts');
});

test('backendSpawn: packaged points at dist/server.js', () => {
    const plan = backendSpawn('D:\\\\fake\\\\backend', false, {
        resolveNode: () => ({ command: 'C:\\\\node.exe', asElectronNode: false }),
    });
    assert.match(plan.args[0], /dist[\\/]+server\.js$/);
    assert.equal(plan.args.length, 1);
});
