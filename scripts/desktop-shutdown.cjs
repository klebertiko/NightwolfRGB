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
 * NEVER includes Cursor, browsers, or any other GUI client.
 *
 * 5173/3001 also allow electron.exe — Vite/backend may be spawned via
 * ELECTRON_RUN_AS_NODE (process name stays Electron). freePorts must still
 * never kill the main BrowserWindow PID (caller passes excludePids).
 */
const KILL_TARGETS = [
    { port: 5173, names: new Set(['node', 'node.exe', 'electron', 'electron.exe']) },
    { port: 3001, names: new Set(['node', 'node.exe', 'electron', 'electron.exe']) },
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
 *   1. Kill each service process tree (backend, Vite, …) via taskkill /T /F.
 *   2. freePorts() reaps any leftover LISTENING sockets (zombies).
 *   3. exit(0) — never returns.
 *
 * @param {{
 *   servicePids?: Array<number|null|undefined>,
 *   backendPid?: number|null,
 *   spawn: (cmd: string, args: string[], opts: object) => import('child_process').ChildProcess,
 *   exit: (code: number) => void,
 *   freePorts: (opts?: { excludePids?: number[] }) => Promise<void>|void,
 *   killTimeoutMs?: number,
 *   excludePids?: number[],
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

async function quitDesktop({
    servicePids,
    backendPid = null,
    spawn,
    exit,
    freePorts,
    killTimeoutMs = DEFAULT_KILL_TIMEOUT_MS,
    excludePids = [],
}) {
    const pids = [
        ...new Set(
            [...(servicePids || []), backendPid]
                .filter((pid) => typeof pid === 'number' && pid > 0),
        ),
    ];

    for (const pid of pids) {
        const { cmd, args } = killTreeArgs(pid);
        const child = spawn(cmd, args, {
            windowsHide: true,
            stdio: 'ignore',
            detached: false,
        });
        await waitForCloseOrTimeout(child, killTimeoutMs);
    }

    try {
        await Promise.race([
            Promise.resolve(freePorts({ excludePids })),
            new Promise((resolve) => setTimeout(resolve, killTimeoutMs)),
        ]);
    } catch (err) {
        console.error('Nightwolf freePorts during quit:', err);
    }
    exit(0);
}

module.exports = { KILL_TARGETS, killTreeArgs, parseListeningPids, quitDesktop, DEFAULT_KILL_TIMEOUT_MS };
