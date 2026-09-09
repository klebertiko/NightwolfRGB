/**
 * Windows taskbar identity — pin/start-menu must not show the stock Electron icon.
 *
 * Run: node --test scripts/windows-app-identity.test.cjs
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('Windows .ico exists for the Electron host', () => {
    assert.equal(fs.existsSync(path.join(ROOT, 'electron', 'icon.ico')), true);
});

test('main sets AppUserModelId before the single-instance lock', () => {
    const src = read('electron/main.cjs');
    const aumid = src.indexOf("setAppUserModelId('com.nightwolf.rgb')");
    const lock = src.indexOf('requestSingleInstanceLock');
    assert.ok(aumid >= 0, 'AUMID is how Windows groups a pin');
    assert.ok(lock > aumid, 'AUMID must be set before Windows sees the process');
});

test('main writes a Start Menu shortcut with the wolf icon and AUMID', () => {
    const src = read('electron/main.cjs');
    assert.match(src, /writeShortcutLink/);
    assert.match(src, /Nightwolf RGB\.lnk/);
    assert.match(src, /appUserModelId:\s*'com\.nightwolf\.rgb'/);
    assert.match(src, /icon\.ico/);
});

test('desktop launcher stamps electron.exe before spawn', () => {
    const launcher = read('scripts/run-desktop-electron.cjs');
    const stamp = read('scripts/stamp-electron-icon.cjs');
    assert.match(launcher, /stamp-electron-icon/);
    assert.match(stamp, /from 'rcedit'|require\('rcedit'\)|import\('rcedit'\)/);
    assert.match(stamp, /icon\.ico/);
    assert.match(stamp, /Nightwolf RGB/);
});
