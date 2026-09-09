/**
 * Test-only preload: stub child_process.spawnSync at the Node boundary.
 * Production helpers in update.cjs are not mocked.
 */
const fs = require('fs');
const childProcess = require('child_process');

const original = childProcess.spawnSync.bind(childProcess);

childProcess.spawnSync = function spawnSyncStub(command, args, options) {
    const logPath = process.env.NIGHTWOLF_SPAWN_LOG;
    if (logPath) {
        fs.appendFileSync(
            logPath,
            `${JSON.stringify({ command: String(command), args: Array.isArray(args) ? args : [] })}\n`
        );
    }
    return {
        status: 0,
        stdout: '',
        stderr: '',
        pid: 0,
        signal: null,
        output: [null, '', ''],
        error: undefined,
    };
};

void original;
