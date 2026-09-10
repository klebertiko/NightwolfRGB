#!/usr/bin/env node
/**
 * Fail-closed working-tree secret scan. No network. Skips binaries and deps.
 * Patterns are provider prefixes, not entropy guesses.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const SKIP_DIR = new Set([
    '.git',
    'node_modules',
    'dist',
    'coverage',
    '.gauntlet',
    '.harness',
    '.superpowers',
    '.cache',
]);

const SKIP_EXT = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
    '.exe',
    '.dll',
    '.zip',
    '.woff',
    '.woff2',
    '.pdf',
]);

const RULES = [
    { name: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'github-pat', re: /\bghp_[A-Za-z0-9]{20,}\b/ },
    { name: 'github-fine-grained', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
    { name: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
    { name: 'private-key', re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
];

function walk(dir, acc) {
    for (const name of fs.readdirSync(dir)) {
        if (SKIP_DIR.has(name)) continue;
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
            walk(full, acc);
            continue;
        }
        if (SKIP_EXT.has(path.extname(name).toLowerCase())) continue;
        if (st.size > 1024 * 1024) continue;
        acc.push(full);
    }
    return acc;
}

function scanFile(file) {
    const text = fs.readFileSync(file, 'utf8');
    const hits = [];
    for (const rule of RULES) {
        if (rule.re.test(text)) hits.push(rule.name);
    }
    return hits;
}

function main() {
    const files = walk(root, []);
    const findings = [];
    for (const file of files) {
        const hits = scanFile(file);
        if (hits.length) {
            findings.push({ file: path.relative(root, file), hits });
        }
    }
    if (findings.length) {
        console.error('secrets-scan: FAIL');
        for (const row of findings) {
            console.error(`  ${row.file}: ${row.hits.join(', ')}`);
        }
        process.exit(1);
    }
    console.log(`secrets-scan: PASS (${files.length} files)`);
}

if (require.main === module) {
    main();
}

module.exports = { walk, scanFile, RULES, SKIP_DIR };
