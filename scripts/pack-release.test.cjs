'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pack } = require('./pack-release.cjs');

test('pack refuses a tree without OpenRGB.exe', () => {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-empty-src-'));
    try {
        fs.writeFileSync(path.join(source, 'package.json'), '{"name":"x"}');
        assert.throws(() => pack({ source, requireOpenRgb: true }), /OpenRGB\.exe missing/);
    } finally {
        fs.rmSync(source, { recursive: true, force: true });
    }
});

test('pack with requireOpenRgb false still writes install scripts beside the zip', () => {
    const source = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-pack-src-'));
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-pack-out-'));
    try {
        fs.writeFileSync(path.join(source, 'package.json'), '{"name":"nightwolf-rgb"}');
        const zipPath = pack({ source, requireOpenRgb: false, outDir, keepStaging: false });
        assert.equal(fs.existsSync(zipPath), true);
        assert.equal(fs.existsSync(path.join(outDir, 'install.ps1')), true);
        assert.equal(fs.existsSync(path.join(outDir, 'install.sh')), true);
        assert.match(path.basename(zipPath), /nightwolf-windows-x64\.zip/);
    } finally {
        fs.rmSync(source, { recursive: true, force: true });
        fs.rmSync(outDir, { recursive: true, force: true });
    }
});
