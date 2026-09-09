#!/usr/bin/env node
/**
 * nightwolfrgb — installed shim. `nightwolfrgb update` applies the latest
 * GitHub Release and then refreshes the bundled OpenRGB engine.
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const root = process.env.NIGHTWOLF_ROOT || path.resolve(__dirname, '..');
const cmd = process.argv[2] || 'help';

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        windowsHide: true,
        env: process.env,
    });
    if (result.status !== 0) process.exit(result.status == null ? 1 : result.status);
}

function help() {
    console.log('nightwolfrgb update   apply latest GitHub Release + OpenRGB');
    console.log('nightwolfrgb help     this text');
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
    help();
    process.exit(0);
}

if (cmd !== 'update') {
    console.error(`unknown command: ${cmd}`);
    help();
    process.exit(1);
}

if (process.platform === 'win32') {
    const ps1 = path.join(root, 'scripts', 'install.ps1');
    run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1]);
} else {
    console.error('nightwolfrgb update is Windows-only in this release.');
    process.exit(1);
}

run(process.execPath, [path.join(root, 'scripts', 'update-openrgb.cjs')]);
console.log('App release applied. OpenRGB engine checked.');
