const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const script = path.join(__dirname, 'update.cjs');
const preload = path.join(__dirname, 'update.test-preload.cjs');

function runUpdate(args, extraEnv = {}) {
    const logPath = path.join(
        os.tmpdir(),
        `nightwolf-spawn-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`
    );
    const result = spawnSync(process.execPath, ['-r', preload, script, ...args], {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, NIGHTWOLF_SPAWN_LOG: logPath, ...extraEnv },
        windowsHide: true,
    });
    let spawns = [];
    if (fs.existsSync(logPath)) {
        spawns = fs
            .readFileSync(logPath, 'utf8')
            .trim()
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line));
        fs.rmSync(logPath, { force: true });
    }
    return { status: result.status, stdout: result.stdout, stderr: result.stderr, spawns };
}

function spawnedOpenRgbUpdater(spawns) {
    return spawns.some(
        (s) =>
            Array.isArray(s.args) &&
            s.args.some((a) => String(a).replace(/\\/g, '/').endsWith('scripts/update-openrgb.cjs'))
    );
}

test('--dry-run prints an OpenRGB inventory and does not download or run npm update', () => {
    const result = runUpdate(['--dry-run']);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /binary bundle/i);
    assert.match(result.stdout, /OpenRGB is the only/i);
    assert.match(result.stdout, /Dry-run: no downloads, no npm update/i);
    assert.doesNotMatch(result.stdout, /spawning scripts[/\\]update-openrgb/i);
    assert.doesNotMatch(result.stdout, /npm update —/);
    assert.equal(result.spawns.length, 0);
});

test('--bundles invokes the OpenRGB updater script', () => {
    const result = runUpdate(['--bundles']);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok(spawnedOpenRgbUpdater(result.spawns), result.stdout);
});

test('--app does not call the OpenRGB downloader', () => {
    const result = runUpdate(['--app']);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(spawnedOpenRgbUpdater(result.spawns), false, result.stdout);
    assert.ok(
        result.spawns.some((s) => {
            const cmd = String(s.command).toLowerCase();
            const argv = (s.args || []).map(String);
            return /npm/.test(cmd) && argv.includes('update');
        }),
        'expected npm update in a workspace tree'
    );
});

test('unknown flags exit with a clear error', () => {
    const result = runUpdate(['--not-a-real-flag']);
    assert.notEqual(result.status, 0);
    const text = `${result.stderr}\n${result.stdout}`;
    assert.match(text, /unknown flag/i);
    assert.match(text, /--not-a-real-flag/);
});

test('missing OpenRGB README exits with a clear error', () => {
    const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwolf-noroadme-'));
    fs.mkdirSync(path.join(fixture, 'bin', 'OpenRGB'), { recursive: true });
    try {
        const result = runUpdate(['--dry-run'], { NIGHTWOLF_ROOT: fixture });
        assert.notEqual(result.status, 0);
        assert.match(`${result.stderr}\n${result.stdout}`, /missing.*OpenRGB README/i);
    } finally {
        fs.rmSync(fixture, { recursive: true, force: true });
    }
});
