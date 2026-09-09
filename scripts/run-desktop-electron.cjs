#!/usr/bin/env node
'use strict';
/**
 * run-desktop-electron.cjs
 *
 * Replaces the inline `npx wait-on … && npx electron .` fragment in the
 * `desktop` npm script.  Using a Node wrapper (instead of shell `&&`) ensures
 * that `free-desktop-ports.cjs` always runs after Electron exits — even when
 * Electron exits with a non-zero code.
 *
 * Steps:
 *   1. Wait for the Vite dev server (http://127.0.0.1:5173) to be ready.
 *   2. Spawn Electron and wait for it to exit.
 *   3. Always run free-desktop-ports.cjs (cleans up Vite on 5173 if -k misses).
 *   4. Exit with Electron's exit code.
 *
 * Run via:  node scripts/run-desktop-electron.cjs
 */
const { spawnSync } = require('child_process');
const http = require('http');
const path = require('path');

const DEV_URL = process.env.NIGHTWOLF_DEV_URL || 'http://127.0.0.1:5173';
const WAIT_TIMEOUT_MS = 45000;

/** Resolves when the URL responds with any HTTP status, rejects on timeout. */
function waitForHttp(url, timeoutMs) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const req = http.get(url, (res) => {
                res.resume();
                resolve();
            });
            req.on('error', () => {
                if (Date.now() - started > timeoutMs) {
                    reject(new Error(`Timeout waiting for ${url}`));
                    return;
                }
                setTimeout(attempt, 400);
            });
        };
        attempt();
    });
}

async function main() {
    // Step 1 — wait for Vite
    try {
        await waitForHttp(DEV_URL, WAIT_TIMEOUT_MS);
    } catch (err) {
        console.error(`[run-desktop-electron] ${err.message}`);
        process.exit(1);
    }

    // Step 2 — stamp PE icon, then run Electron (blocking)
    const { stampElectronIcon } = require('./stamp-electron-icon.cjs');
    try {
        await stampElectronIcon();
    } catch (err) {
        console.warn(`[run-desktop-electron] icon stamp skipped: ${err.message}`);
    }
    const electronPath = require('electron');
    const electronResult = spawnSync(electronPath, ['.'], {
        stdio: 'inherit',
        shell: false,
        windowsHide: false,
    });

    // Step 3 — always free ports, regardless of Electron exit code
    spawnSync(process.execPath, [path.join(__dirname, 'free-desktop-ports.cjs')], {
        stdio: 'inherit',
        shell: false,
    });

    // Step 4 — propagate Electron's exit code
    process.exit(electronResult.status ?? 0);
}

main().catch((err) => {
    console.error('[run-desktop-electron] fatal:', err);
    process.exit(1);
});
