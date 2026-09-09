#!/usr/bin/env node
/**
 * Developer update orchestrator for Nightwolf RGB.
 *
 *   npm run update                 inventory + OpenRGB + npm trees
 *   npm run update -- --dry-run    inventory only
 *   npm run update:bundles         OpenRGB binary only
 *   npm run update:app             npm trees only
 *   npm run update -- --tag <name> pin OpenRGB to a Codeberg tag
 *
 * OpenRGB download logic lives in scripts/update-openrgb.cjs — this file
 * only spawns it. Brand (`npm run brand`) is not a vendor bundle.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(process.env.NIGHTWOLF_ROOT || path.join(__dirname, '..'));
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const bundlesOnly = args.includes('--bundles');
const appOnly = args.includes('--app');
const tagIndex = args.indexOf('--tag');
const requestedTag = tagIndex >= 0 ? args[tagIndex + 1] : null;

function parseArgs() {
    const knownFlags = new Set(['--dry-run', '--bundles', '--app', '--tag']);
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (!arg.startsWith('--')) {
            throw new Error(`Unknown argument: ${arg}`);
        }
        if (!knownFlags.has(arg)) {
            throw new Error(`Unknown flag: ${arg}`);
        }
        if (arg === '--tag') i += 1;
    }
    if (tagIndex >= 0 && (!requestedTag || requestedTag.startsWith('--'))) {
        throw new Error('Missing value for --tag');
    }
    const readme = path.join(root, 'bin', 'OpenRGB', 'README.md');
    if (!fs.existsSync(readme)) {
        throw new Error('Missing OpenRGB README: bin/OpenRGB/README.md');
    }
}

const doBundles = !appOnly || bundlesOnly;
const doApp = !bundlesOnly || appOnly;

const trees = [
    { label: 'root', cwd: root },
    { label: 'backend', cwd: path.join(root, 'backend') },
    { label: 'frontend', cwd: path.join(root, 'frontend') },
];

function resolveNpm() {
    const sibling = path.join(
        path.dirname(process.execPath),
        process.platform === 'win32' ? 'npm.cmd' : 'npm'
    );
    if (fs.existsSync(sibling)) return sibling;
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

const npmBin = resolveNpm();

function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function readOpenRgbVersion() {
    return readJson(path.join(root, 'bin', 'OpenRGB', 'VERSION.json'));
}

function pkgLine(cwd) {
    const pkg = readJson(path.join(cwd, 'package.json'));
    return pkg ? `${pkg.name}@${pkg.version}` : '(missing package.json)';
}

function run(cmd, cmdArgs, opts) {
    return spawnSync(cmd, cmdArgs, {
        encoding: 'utf8',
        windowsHide: true,
        env: process.env,
        ...opts,
    });
}

function npm(cwd, npmArgs, inherit) {
    return run(npmBin, npmArgs, {
        cwd,
        shell: process.platform === 'win32',
        stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
}

function outdatedMap(cwd) {
    const result = npm(cwd, ['outdated', '--json']);
    const text = (result.stdout || '').trim();
    if (!text || text === '{}') return {};
    try {
        const data = JSON.parse(text);
        return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch {
        return {};
    }
}

function printInventory() {
    const ver = readOpenRgbVersion();
    console.log('Nightwolf RGB — developer update / atualização do desenvolvedor');
    console.log('');
    console.log('App (npm, existing semver ranges)');
    for (const tree of trees) {
        console.log(`  ${tree.label.padEnd(10)} ${pkgLine(tree.cwd)}`);
    }
    console.log('');
    console.log('Binary bundle / bundle binário (1) — OpenRGB is the only one');
    if (ver) {
        console.log(`  OpenRGB    tag ${ver.tag}${ver.asset ? `  (${ver.asset})` : ''}`);
    } else {
        console.log('  OpenRGB    VERSION.json not present / não instalado localmente');
    }
    console.log('');
    console.log('Not binary bundles (update via npm, not this binary path):');
    console.log('  Electron (root), openrgb-sdk (backend protocol client), frontend/backend packages');
    console.log('  Brand icons: npm run brand — skipped here');
    console.log('');
    console.log('Shipped .exe auto-update: NOT available yet (no installer / electron-updater).');
    console.log('Atualização do .exe empacotado: ainda não existe.');
}

function updateOpenRgb() {
    const script = path.join(__dirname, 'update-openrgb.cjs');
    const extra = requestedTag ? ['--tag', requestedTag] : [];
    console.log('');
    console.log('OpenRGB — spawning scripts/update-openrgb.cjs');
    const result = run(process.execPath, [script, ...extra], {
        cwd: root,
        stdio: 'inherit',
    });
    if (result.status !== 0) {
        throw new Error('OpenRGB update failed');
    }
}

function formatOutdated(map) {
    return Object.entries(map).map(([name, info]) => {
        const from = info.current || '?';
        const to = info.wanted || info.latest || '?';
        return `${name} ${from} → ${to}`;
    });
}

function updateNpmTrees() {
    console.log('');
    console.log(`npm update — ${npmBin} (same node: ${process.execPath})`);
    const changed = [];
    for (const tree of trees) {
        const before = outdatedMap(tree.cwd);
        const names = formatOutdated(before);
        console.log(`  ${tree.label}/`);
        const result = npm(tree.cwd, ['update'], true);
        if (result.status !== 0) {
            throw new Error(`npm update failed in ${tree.label}/`);
        }
        if (names.length === 0) {
            changed.push({ label: tree.label, lines: ['already current / já atualizado'] });
        } else {
            changed.push({ label: tree.label, lines: names });
        }
    }
    return changed;
}

function printSummary(npmChanges) {
    const ver = readOpenRgbVersion();
    console.log('');
    console.log('Summary / Resumo');
    if (doBundles && !dryRun) {
        console.log(ver ? `  OpenRGB    ${ver.tag}` : '  OpenRGB    VERSION.json still missing');
    } else if (ver) {
        console.log(`  OpenRGB    ${ver.tag} (unchanged this run)`);
    } else {
        console.log('  OpenRGB    not installed');
    }
    if (npmChanges) {
        for (const group of npmChanges) {
            console.log(`  npm ${group.label}: ${group.lines.join(', ')}`);
        }
    } else if (dryRun) {
        console.log('  npm        skipped (--dry-run)');
    } else if (!doApp) {
        console.log('  npm        skipped (--bundles)');
    }
    console.log('  App .exe   no packaged auto-update yet');
}

async function main() {
    parseArgs();
    printInventory();

    if (dryRun) {
        console.log('');
        console.log('Dry-run: no downloads, no npm update.');
        printSummary(null);
        return;
    }

    let npmChanges = null;
    if (doBundles) updateOpenRgb();
    if (doApp) npmChanges = updateNpmTrees();
    printSummary(npmChanges);
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
