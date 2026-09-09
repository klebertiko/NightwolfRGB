'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { KILL_TARGETS, killTreeArgs, quitDesktop, parseListeningPids } = require('./desktop-shutdown.cjs');

// ─── parseListeningPids — exact-port matching (bounce fix) ───────────────────

// Shared sample netstat output that covers all edge cases the bounce identified.
const SAMPLE_NETSTAT = [
    'Active Connections',
    '',
    '  Proto  Local Address          Foreign Address        State           PID',
    '  TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       2001',
    '  TCP    127.0.0.1:5173         0.0.0.0:0              LISTENING       2002',
    '  TCP    [::1]:5173             [::]:0                 LISTENING       2003',
    // false positives that the old substring code would match for port 5173:
    '  TCP    127.0.0.1:51730        0.0.0.0:0              LISTENING       9001',
    '  TCP    127.0.0.1:51739        0.0.0.0:0              LISTENING       9002',
    '  TCP    127.0.0.1:15173        0.0.0.0:0              LISTENING       9003',
    // port 3001 exact match and false positives:
    '  TCP    0.0.0.0:3001           0.0.0.0:0              LISTENING       3001',
    '  TCP    0.0.0.0:30010          0.0.0.0:0              LISTENING       9004',
    '  TCP    0.0.0.0:30015          0.0.0.0:0              LISTENING       9005',
    '  TCP    0.0.0.0:30019          0.0.0.0:0              LISTENING       9006',
    // port 6742 exact match:
    '  TCP    0.0.0.0:6742           0.0.0.0:0              LISTENING       6742',
    // noise — ESTABLISHED (must be ignored):
    '  TCP    127.0.0.1:5173         127.0.0.1:12345        ESTABLISHED     555',
    // noise — pid 0 (must be ignored):
    '  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       0',
].join('\r\n');

test('parseListeningPids: 127.0.0.1:51730 is NOT selected for port 5173', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(!pids.includes(9001), '9001 (port 51730) must not be selected for 5173');
});

test('parseListeningPids: 127.0.0.1:51739 is NOT selected for port 5173', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(!pids.includes(9002), '9002 (port 51739) must not be selected for 5173');
});

test('parseListeningPids: 127.0.0.1:15173 is NOT selected for port 5173', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(!pids.includes(9003), '9003 (port 15173) must not be selected for 5173');
});

test('parseListeningPids: 0.0.0.0:30010 is NOT selected for port 3001', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 3001);
    assert.ok(!pids.includes(9004), '9004 (port 30010) must not be selected for 3001');
});

test('parseListeningPids: 0.0.0.0:30015 is NOT selected for port 3001', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 3001);
    assert.ok(!pids.includes(9005), '9005 (port 30015) must not be selected for 3001');
});

test('parseListeningPids: 0.0.0.0:30019 is NOT selected for port 3001', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 3001);
    assert.ok(!pids.includes(9006), '9006 (port 30019) must not be selected for 3001');
});

test('parseListeningPids: 0.0.0.0:5173 IS selected for port 5173 (IPv4 any)', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(pids.includes(2001), '2001 (0.0.0.0:5173) must be selected');
});

test('parseListeningPids: 127.0.0.1:5173 IS selected for port 5173', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(pids.includes(2002), '2002 (127.0.0.1:5173) must be selected');
});

test('parseListeningPids: [::1]:5173 IS selected for port 5173 (IPv6)', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(pids.includes(2003), '2003 ([::1]:5173) must be selected');
});

test('parseListeningPids: 0.0.0.0:3001 IS selected for port 3001', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 3001);
    assert.ok(pids.includes(3001), '3001 (0.0.0.0:3001) must be selected');
});

test('parseListeningPids: ESTABLISHED lines are ignored', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 5173);
    assert.ok(!pids.includes(555), '555 is ESTABLISHED, must not be selected');
});

test('parseListeningPids: pid 0 lines are ignored', () => {
    const pids = parseListeningPids(SAMPLE_NETSTAT, 135);
    assert.ok(!pids.includes(0), 'pid 0 must never be selected');
});

// ─── AC#1 — killTreeArgs ─────────────────────────────────────────────────────

test('killTreeArgs: cmd is taskkill', () => {
    const { cmd } = killTreeArgs(42);
    assert.equal(cmd, 'taskkill');
});

test('killTreeArgs: args include /T', () => {
    const { args } = killTreeArgs(42);
    assert.ok(args.includes('/T'), 'args must include /T');
});

test('killTreeArgs: args include /F', () => {
    const { args } = killTreeArgs(42);
    assert.ok(args.includes('/F'), 'args must include /F');
});

test('killTreeArgs: args include pid as string', () => {
    const { args } = killTreeArgs(9999);
    assert.ok(args.includes('9999'), 'pid must appear in args as a string');
});

// ─── AC#2 — KILL_TARGETS allowlist ───────────────────────────────────────────

test('KILL_TARGETS: covers exactly ports 5173, 3001, 6742', () => {
    const ports = KILL_TARGETS.map((t) => t.port).sort((a, b) => a - b);
    assert.deepEqual(ports, [3001, 5173, 6742]);
});

test('KILL_TARGETS: port 5173 allows only node / node.exe', () => {
    const t = KILL_TARGETS.find((t) => t.port === 5173);
    assert.ok(t, 'must have an entry for port 5173');
    assert.deepEqual([...t.names].sort(), ['node', 'node.exe'].sort());
});

test('KILL_TARGETS: port 3001 allows only node / node.exe', () => {
    const t = KILL_TARGETS.find((t) => t.port === 3001);
    assert.ok(t, 'must have an entry for port 3001');
    assert.deepEqual([...t.names].sort(), ['node', 'node.exe'].sort());
});

test('KILL_TARGETS: port 6742 allows only openrgb / openrgb.exe', () => {
    const t = KILL_TARGETS.find((t) => t.port === 6742);
    assert.ok(t, 'must have an entry for port 6742');
    assert.deepEqual([...t.names].sort(), ['openrgb', 'openrgb.exe'].sort());
});

test('KILL_TARGETS: Cursor is never in the kill allowlist', () => {
    for (const t of KILL_TARGETS) {
        for (const name of t.names) {
            assert.ok(
                !/cursor/i.test(name),
                `allowlist must not include cursor — got "${name}" on port ${t.port}`,
            );
        }
    }
});

// ─── AC#1 — quitDesktop behaviour ────────────────────────────────────────────

test('quitDesktop: kills backend tree then frees ports then calls exit(0)', async () => {
    const spawnLog = [];
    let exitCode = null;
    let freePortsCalled = false;

    const fakeSpawn = (cmd, args, _opts) => {
        spawnLog.push({ cmd, args: [...args] });
        const cbs = {};
        const child = { on(ev, fn) { cbs[ev] = fn; return child; } };
        setImmediate(() => cbs.close?.());
        return child;
    };

    await quitDesktop({
        backendPid: 9999,
        spawn: fakeSpawn,
        exit: (c) => { exitCode = c; },
        freePorts: async () => { freePortsCalled = true; },
    });

    assert.equal(spawnLog.length, 1, 'spawn should be called once');
    assert.equal(spawnLog[0].cmd, 'taskkill');
    assert.ok(spawnLog[0].args.includes('/T'), 'spawn args must include /T');
    assert.ok(spawnLog[0].args.includes('/F'), 'spawn args must include /F');
    assert.ok(spawnLog[0].args.includes('9999'), 'spawn args must include pid string');
    assert.equal(freePortsCalled, true, 'freePorts must be called');
    assert.equal(exitCode, 0, 'exit must be called with 0');
});

test('quitDesktop: hung taskkill still frees ports and exits after timeout', async () => {
    const started = Date.now();
    let exitCode = null;
    let freePortsCalled = false;

    const hungSpawn = () => ({
        on() { return this; },
    });

    await quitDesktop({
        backendPid: 42,
        spawn: hungSpawn,
        exit: (c) => { exitCode = c; },
        freePorts: async () => { freePortsCalled = true; },
        killTimeoutMs: 40,
    });

    assert.equal(freePortsCalled, true, 'freePorts must run even if taskkill hangs');
    assert.equal(exitCode, 0, 'exit must still be called with 0');
    assert.ok(Date.now() - started < 1500, 'must not wait forever on a zombie tree');
});

test('quitDesktop: null backendPid — skips spawn, still frees ports and exits 0', async () => {
    let freePortsCalled = false;
    let exitCode = null;

    const mustNotSpawn = () => {
        throw new Error('spawn must not be called when backendPid is null');
    };

    await quitDesktop({
        backendPid: null,
        spawn: mustNotSpawn,
        exit: (c) => { exitCode = c; },
        freePorts: async () => { freePortsCalled = true; },
    });

    assert.equal(freePortsCalled, true, 'freePorts must be called even with no backendPid');
    assert.equal(exitCode, 0, 'exit must be called with 0');
});
