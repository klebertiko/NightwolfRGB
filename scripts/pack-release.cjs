#!/usr/bin/env node
/**
 * Packs a GitHub Release zip. Not an installer .exe.
 * Refuses to write the zip if OpenRGB.exe is missing — a release without
 * the engine is not a functional build.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

const SKIP_DIR = new Set([
    '.git',
    'node_modules',
    'dist',
    'coverage',
    '.gauntlet',
    '.cache',
    '.harness',
    '.superpowers',
]);

const SKIP_FILE = new Set(['.env', '.env.local']);

function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const name of fs.readdirSync(from)) {
        if (SKIP_DIR.has(name) || SKIP_FILE.has(name)) continue;
        const src = path.join(from, name);
        const dest = path.join(to, name);
        const st = fs.statSync(src);
        if (st.isDirectory()) copyTree(src, dest);
        else fs.copyFileSync(src, dest);
    }
}

function zipStaging(staging, zipPath) {
    fs.mkdirSync(path.dirname(zipPath), { recursive: true });
    if (fs.existsSync(zipPath)) fs.rmSync(zipPath);
    const tar = spawnSync(
        'tar',
        ['-a', '-c', '-f', zipPath, '-C', staging, '.'],
        { encoding: 'utf8', windowsHide: true }
    );
    if (tar.status !== 0) {
        throw new Error(tar.stderr || tar.stdout || 'tar zip failed');
    }
}

function verifyZipTree(staging) {
    const required = [
        'package.json',
        'electron/main.cjs',
        'scripts/update-openrgb.cjs',
        'scripts/install.ps1',
        'scripts/install.sh',
        'bin/OpenRGB/OpenRGB.exe',
        'bin/OpenRGB/README.md',
    ];
    const missing = required.filter((rel) => !fs.existsSync(path.join(staging, rel)));
    if (missing.length) {
        throw new Error(`Release zip incomplete: ${missing.join(', ')}`);
    }
}

function pack(opts = {}) {
    const requireOpenRgb = opts.requireOpenRgb !== false;
    const source = opts.source || root;
    const staging = opts.staging || fs.mkdtempSync(path.join(os.tmpdir(), 'nightwolf-release-'));
    copyTree(source, staging);

    const exe = path.join(staging, 'bin', 'OpenRGB', 'OpenRGB.exe');
    if (requireOpenRgb && !fs.existsSync(exe)) {
        if (!opts.keepStaging) fs.rmSync(staging, { recursive: true, force: true });
        throw new Error('OpenRGB.exe missing — refuse to pack a non-functional release');
    }
    if (requireOpenRgb) verifyZipTree(staging);

    const outDir = opts.outDir || path.join(root, 'dist', 'release');
    const zipPath = path.join(outDir, 'nightwolf-windows-x64.zip');
    zipStaging(staging, zipPath);

    const installPs1 = path.join(root, 'scripts', 'install.ps1');
    const installSh = path.join(root, 'scripts', 'install.sh');
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(installPs1, path.join(outDir, 'install.ps1'));
    fs.copyFileSync(installSh, path.join(outDir, 'install.sh'));

    if (!opts.keepStaging) fs.rmSync(staging, { recursive: true, force: true });
    return zipPath;
}

if (require.main === module) {
    try {
        const zipPath = pack();
        console.log(`Packed ${zipPath}`);
    } catch (err) {
        console.error(err.message || err);
        process.exit(1);
    }
}

module.exports = { pack, copyTree, SKIP_DIR, verifyZipTree };
