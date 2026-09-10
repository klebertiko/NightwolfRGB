#!/usr/bin/env node
/**
 * Fail-closed gates for Nightwolf RGB. Order is scan → audit → compile → test.
 * A later gate never runs if an earlier one fails. This is what CI and
 * release both call; there is no bypass flag.
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

function run(label, command, args, cwd) {
    console.log(`\n── gate: ${label} ──`);
    const result = spawnSync(command, args, {
        cwd: cwd || root,
        encoding: 'utf8',
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: process.env,
        windowsHide: true,
    });
    if (result.status !== 0) {
        console.error(`gate FAIL: ${label} (exit ${result.status})`);
        process.exit(result.status == null ? 1 : result.status);
    }
    console.log(`gate PASS: ${label}`);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;

run('secrets', node, [path.join(root, 'scripts', 'secrets-scan.cjs')]);

run('audit:root', npm, ['audit', '--audit-level=critical']);
run('audit:backend', npm, ['audit', '--audit-level=critical'], path.join(root, 'backend'));
run('audit:frontend', npm, ['audit', '--audit-level=critical'], path.join(root, 'frontend'));

run('compile:backend', npm, ['run', 'build'], path.join(root, 'backend'));
run('compile:frontend-types', npm, ['run', 'typecheck'], path.join(root, 'frontend'));
run('compile:frontend', npm, ['run', 'build'], path.join(root, 'frontend'));

const tests = [
    'scripts/lighting-engine.test.cjs',
    'scripts/canvas-layout.test.cjs',
    'scripts/type-roles.test.cjs',
    'scripts/effect-workbench-state.test.cjs',
    'scripts/chrome-ia.test.cjs',
    'scripts/openrgb-parity.test.cjs',
    'scripts/windows-app-identity.test.cjs',
    'scripts/desktop-shutdown.test.cjs',
    'scripts/desktop-restore.test.cjs',
    'scripts/desktop-boot.test.cjs',
    'scripts/pack-release.test.cjs',
    'scripts/secrets-scan.test.cjs',
    'scripts/landing-pages.test.cjs',
];
run('test:unit', node, ['--test', ...tests]);
run('test:update-safe', node, [
    '--test',
    '--test-name-pattern=dry-run|unknown flags|missing OpenRGB',
    'scripts/update.test.cjs',
]);

console.log('\nAll gates passed. Safe to pack a release.');
