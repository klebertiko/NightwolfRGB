'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scanFile, RULES, SKIP_DIR } = require('./secrets-scan.cjs');

test('scanFile flags an AWS access key literal', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-secret-'));
    const file = path.join(dir, 'leak.txt');
    const id = ['AKI', 'A', 'IOSFODNN7EXAMPL', 'E'].join('');
    fs.writeFileSync(file, `key=${id}\n`);
    try {
        const hits = scanFile(file);
        assert.ok(hits.includes('aws-access-key'));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('scanFile is quiet on ordinary source', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nw-secret-clean-'));
    const file = path.join(dir, 'ok.js');
    fs.writeFileSync(file, 'const port = 6742;\n');
    try {
        assert.deepEqual(scanFile(file), []);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('node_modules is in the skip set', () => {
    assert.equal(SKIP_DIR.has('node_modules'), true);
});

test('private-key rule is registered', () => {
    assert.ok(RULES.some((r) => r.name === 'private-key'));
});
