'use strict';
/**
 * Desktop boot plan for Nightwolf RGB (dev).
 *
 * Lifecycle:
 *   boot  → freePorts (no zombies) → spawn backend + Vite → wait HTTP
 *   quit  → kill service trees → freePorts → exit
 *
 * Under Electron, prefer a real `node.exe` from PATH for children (named node,
 * so freePorts can reap them). Fallback: process.execPath + ELECTRON_RUN_AS_NODE.
 */

const fs = require('fs');
const path = require('path');

const DEV_FRONTEND_PORT = 5173;
const BACKEND_PORT = 3001;

/**
 * @param {{ isDev: boolean, backendOpen: boolean, frontendOpen: boolean }} state
 * @returns {{ startBackend: boolean, startFrontend: boolean }}
 */
function resolveBootPlan({ isDev, backendOpen, frontendOpen }) {
    if (!isDev) {
        return { startBackend: !backendOpen, startFrontend: false };
    }
    return {
        startBackend: !backendOpen,
        startFrontend: !frontendOpen,
    };
}

/**
 * @param {{ quitting: boolean, hide: () => void, initiateQuit: () => void }} deps
 * @returns {'ignored'|'quit-started'}
 */
function beginCloseQuit({ quitting, hide, initiateQuit }) {
    if (quitting) return 'ignored';
    initiateQuit();
    hide();
    return 'quit-started';
}

/**
 * Resolve which binary runs Vite / ts-node children.
 * @param {{ electron?: boolean, pathEnv?: string, execPath?: string, nightwolfNode?: string|null, existsSync?: (p: string) => boolean }} [opts]
 * @returns {{ command: string, asElectronNode: boolean }}
 */
function resolveNodeExecutable(opts = {}) {
    const underElectron = opts.electron ?? Boolean(process.versions.electron);
    const execPath = opts.execPath ?? process.execPath;
    const existsSync = opts.existsSync ?? ((p) => fs.existsSync(p));
    const nightwolfNode = opts.nightwolfNode !== undefined
        ? opts.nightwolfNode
        : process.env.NIGHTWOLF_NODE || null;

    if (!underElectron) {
        return { command: execPath, asElectronNode: false };
    }
    if (nightwolfNode && existsSync(nightwolfNode)) {
        return { command: nightwolfNode, asElectronNode: false };
    }

    const pathEnv = opts.pathEnv ?? process.env.Path ?? process.env.PATH ?? '';
    const sep = process.platform === 'win32' ? ';' : ':';
    const bin = process.platform === 'win32' ? 'node.exe' : 'node';
    for (const dir of pathEnv.split(sep)) {
        if (!dir) continue;
        const candidate = path.join(dir.trim(), bin);
        try {
            if (existsSync(candidate)) {
                return { command: candidate, asElectronNode: false };
            }
        } catch {
            /* ignore bad PATH entries */
        }
    }
    return { command: execPath, asElectronNode: true };
}

/**
 * @param {boolean} asElectronNode
 * @param {NodeJS.ProcessEnv} [extra]
 */
function childNodeEnv(asElectronNode, extra = {}) {
    const env = {
        ...process.env,
        ...extra,
        FORCE_COLOR: '1',
    };
    if (asElectronNode) {
        env.ELECTRON_RUN_AS_NODE = '1';
    } else {
        delete env.ELECTRON_RUN_AS_NODE;
    }
    return env;
}

/**
 * @param {string} frontendDir
 * @param {{ resolveNode?: typeof resolveNodeExecutable }} [deps]
 */
function viteSpawn(frontendDir, deps = {}) {
    const resolveNode = deps.resolveNode ?? resolveNodeExecutable;
    const { command, asElectronNode } = resolveNode();
    const viteJs = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');
    return {
        command,
        args: [viteJs],
        options: {
            cwd: frontendDir,
            stdio: 'inherit',
            shell: false,
            windowsHide: true,
            env: childNodeEnv(asElectronNode),
        },
    };
}

/**
 * @param {string} backendDir
 * @param {boolean} isDev
 * @param {{ resolveNode?: typeof resolveNodeExecutable }} [deps]
 */
function backendSpawn(backendDir, isDev, deps = {}) {
    const resolveNode = deps.resolveNode ?? resolveNodeExecutable;
    const { command, asElectronNode } = resolveNode();
    const entry = isDev
        ? path.join(backendDir, 'node_modules', 'ts-node', 'dist', 'bin.js')
        : path.join(backendDir, 'dist', 'server.js');
    const args = isDev ? [entry, 'server.ts'] : [entry];
    return {
        command,
        args,
        options: {
            cwd: backendDir,
            stdio: 'inherit',
            shell: false,
            windowsHide: true,
            env: childNodeEnv(asElectronNode, { TS_NODE_TRANSPILE_ONLY: '1' }),
        },
    };
}

module.exports = {
    DEV_FRONTEND_PORT,
    BACKEND_PORT,
    resolveBootPlan,
    beginCloseQuit,
    resolveNodeExecutable,
    childNodeEnv,
    viteSpawn,
    backendSpawn,
};
