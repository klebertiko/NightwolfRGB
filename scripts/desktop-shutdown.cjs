'use strict';
/**
 * Desktop shutdown module for Nightwolf RGB.
 *
 * All I/O dependencies (spawn, exit, freePorts) are injected so this module
 * is fully testable without touching the real OS or Electron.
 *
 * Public surface:
 *   KILL_TARGETS  — ports + allowed process names (single source of truth)
 *   killTreeArgs  — returns { cmd, args } for a Windows process-tree kill
 *   quitDesktop   — kills backend tree → frees ports → exits
 */

/**
 * Ports and allowed process names for Nightwolf port cleanup.
 * NEVER includes Cursor, browsers, or any other GUI process.
 */
const KILL_TARGETS = [
    { port: 5173, names: new Set(['node', 'node.exe']) },
    { port: 3001, names: new Set(['node', 'node.exe']) },
    { port: 6742, names: new Set(['openrgb', 'openrgb.exe']) },
];

/**
 * Returns the command + args to force-kill a Windows process tree.
 * Equivalent to: taskkill /PID <pid> /T /F
 *
 * @param {number|string} pid
 * @returns {{ cmd: string, args: string[] }}
 */
function killTreeArgs(pid) {
    return { cmd: 'taskkill', args: ['/PID', String(pid), '/T', '/F'] };
}

/**
 * Parses `netstat -ano` output and returns PIDs that are LISTENING on an exact port.
 *
 * Fixes the substring-match bug where `:5173` would match `:51730` or `:15173`.
 * Port comparison is done numerically on the local-address column so that IPv4
 * (0.0.0.0:5173, 127.0.0.1:5173) and IPv6 ([::1]:5173, :::5173) both match.
 *
 * @param {string} netstatOutput  — raw stdout of `netstat -ano`
 * @param {number} port           — exact port to match
 * @returns {number[]}            — unique PIDs (pid 0 excluded)
 */
function parseListeningPids(netstatOutput, port) {
    const pids = new Set();
    for (const line of netstatOutput.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const cols = line.trim().split(/\s+/);
        const local = cols[1] || '';
        // Extract the numeric port from the end of the local-address column.
        // Handles IPv4 (1.2.3.4:PORT) and IPv6 ([::1]:PORT or :::PORT).
        const m = /:(\d+)$/.exec(local);
        if (!m) continue;
        if (Number(m[1]) !== port) continue;
        const pid = cols[cols.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(Number(pid));
    }
    return [...pids];
}

/**
 * Shuts down the Nightwolf desktop cleanly.
 *
 * Steps:
 *   1. Kill the backend process tree (Windows: taskkill /PID … /T /F).
 *      The backend is spawned with `shell: true` so its pid is cmd.exe;
 *      /T propagates the kill to all grandchildren (Vite, OpenRGB via npm).
 *   2. Call freePorts() to release leftover LISTENING sockets.
 *   3. Call exit(0) — never returns.
 *
 * @param {{
 *   backendPid: number|null,
 *   spawn: (cmd: string, args: string[], opts: object) => import('child_process').ChildProcess,
 *   exit: (code: number) => void,
 *   freePorts: () => Promise<void>|void,
 *   killTimeoutMs?: number
 * }} opts
 */
const DEFAULT_KILL_TIMEOUT_MS = 4000;

function waitForCloseOrTimeout(child, ms) {
    return new Promise((resolve) => {
        let settled = false;
        const done = () => {
            if (settled) return;
            settled = true;
            resolve();
        };
        child.on('close', done);
        child.on('error', done);
        setTimeout(done, ms);
    });
}

async function quitDesktop({ backendPid, spawn, exit, freePorts, killTimeoutMs = DEFAULT_KILL_TIMEOUT_MS }) {
    if (backendPid) {
        const { cmd, args } = killTreeArgs(backendPid);
        const child = spawn(cmd, args, {
            windowsHide: true,
            stdio: 'ignore',
            detached: false,
        });
        await waitForCloseOrTimeout(child, killTimeoutMs);
    }

    try {
        await Promise.race([
            Promise.resolve(freePorts()),
            new Promise((resolve) => setTimeout(resolve, killTimeoutMs)),
        ]);
    } catch (err) {
        console.error('Nightwolf freePorts during quit:', err);
    }
    exit(0);
}

module.exports = { KILL_TARGETS, killTreeArgs, parseListeningPids, quitDesktop, DEFAULT_KILL_TIMEOUT_MS };
