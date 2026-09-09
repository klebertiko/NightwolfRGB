#!/usr/bin/env node
'use strict';
/**
 * Frees Nightwolf desktop ports so `npm run desktop` can bind again.
 * Closing the Electron window does not stop Vite; a leftover node keeps 5173.
 *
 * Kill rules live in desktop-shutdown.cjs (KILL_TARGETS) — single source of truth.
 * Only kills LISTENING owners named node/OpenRGB — never a GUI client (Cursor).
 *
 * Usage:
 *   node scripts/free-desktop-ports.cjs        ← run standalone
 *   const { freePorts } = require('./free-desktop-ports.cjs')  ← require in code
 */
const { execSync, execFileSync } = require('child_process');
const { KILL_TARGETS, killTreeArgs, parseListeningPids } = require('./desktop-shutdown.cjs');

function listeningPids(port) {
    const out = execSync('netstat -ano', { encoding: 'utf8' });
    return parseListeningPids(out, port);
}

function imageName(pid) {
    try {
        const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
            encoding: 'utf8',
        });
        const match = out.match(/^"([^"]+)"/);
        return match ? match[1].toLowerCase() : '';
    } catch {
        return '';
    }
}

function killPid(pid) {
    const { cmd, args } = killTreeArgs(pid);
    execFileSync(cmd, args, { stdio: 'ignore', windowsHide: true });
}

/**
 * Kills any LISTENING process on Nightwolf ports (5173/3001/6742) whose
 * image name is in the allow-list for that port.  Never touches Cursor.
 * @returns {number} count of pids killed
 */
function freePorts() {
    let killed = 0;
    for (const target of KILL_TARGETS) {
        for (const pid of listeningPids(target.port)) {
            const name = imageName(pid);
            if (!target.names.has(name)) {
                console.log(`skip pid ${pid} (${name || 'unknown'}) on :${target.port}`);
                continue;
            }
            console.log(`free :${target.port} — kill ${name} pid ${pid}`);
            try {
                killPid(pid);
                killed += 1;
            } catch {
                console.log(`could not kill pid ${pid}`);
            }
        }
    }
    return killed;
}

module.exports = { freePorts };

// Run directly when invoked as main
if (require.main === module) {
    const killed = freePorts();
    if (killed === 0) {
        console.log('desktop ports already free');
    }
}
