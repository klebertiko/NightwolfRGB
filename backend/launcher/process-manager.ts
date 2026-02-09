import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Process Manager - Handles spawning and managing child processes
 */
export class ProcessManager {
    private process: ChildProcess | null = null;
    private platform: string;

    constructor() {
        this.platform = process.platform;
    }

    /**
     * Get the correct OpenRGB executable path based on platform
     */
    getOpenRGBPath(): string {
        // Assume running from backend root (npm run dev/start)
        // bin is in ../bin relative to backend
        const binDir = path.resolve(process.cwd(), '../bin/OpenRGB');

        let executable: string;

        switch (this.platform) {
            case 'win32':
                // Check for 64-bit first, fallback to 32-bit
                const exe64 = path.join(binDir, 'OpenRGB.exe');
                const exe32 = path.join(binDir, 'OpenRGB_x32.exe');

                if (fs.existsSync(exe64)) {
                    executable = exe64;
                } else if (fs.existsSync(exe32)) {
                    executable = exe32;
                } else {
                    throw new Error(
                        `OpenRGB executable not found!\n` +
                        `Please download from: https://gitlab.com/CalcProgrammer1/OpenRGB/-/releases\n` +
                        `And place in: ${binDir}`
                    );
                }
                break;

            case 'linux':
                executable = path.join(binDir, 'openrgb-linux');
                if (!fs.existsSync(executable)) {
                    throw new Error(`Linux OpenRGB binary not found at: ${executable}`);
                }
                break;

            case 'darwin':
                executable = path.join(binDir, 'openrgb-macos');
                if (!fs.existsSync(executable)) {
                    throw new Error(`macOS OpenRGB binary not found at: ${executable}`);
                }
                break;

            default:
                throw new Error(`Unsupported platform: ${this.platform}`);
        }

        return executable;
    }

    /**
     * Spawn OpenRGB process
     */
    spawn(args: string[] = []): ChildProcess {
        const executable = this.getOpenRGBPath();

        console.log(`🚀 Starting OpenRGB: ${executable}`);
        console.log(`   Args: ${args.join(' ')}`);

        // Spawn process
        this.process = spawn(executable, args, {
            detached: false,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Capture stdout
        if (this.process.stdout) {
            this.process.stdout.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.log(`[OpenRGB] ${output}`);
                }
            });
        }

        // Capture stderr
        if (this.process.stderr) {
            this.process.stderr.on('data', (data) => {
                const output = data.toString().trim();
                if (output) {
                    console.error(`[OpenRGB ERROR] ${output}`);
                }
            });
        }

        // Handle process exit
        this.process.on('exit', (code, signal) => {
            if (code !== null) {
                console.log(`[OpenRGB] Process exited with code: ${code}`);
            }
            if (signal !== null) {
                console.log(`[OpenRGB] Process killed with signal: ${signal}`);
            }
            this.process = null;
        });

        // Handle process errors
        this.process.on('error', (err) => {
            console.error(`[OpenRGB] Process error:`, err);
            this.process = null;
        });

        return this.process;
    }

    /**
     * Check if process is running
     */
    isRunning(): boolean {
        return this.process !== null && !this.process.killed;
    }

    /**
     * Get process PID
     */
    getPID(): number | undefined {
        return this.process?.pid;
    }

    /**
     * Kill the process
     */
    async kill(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
        if (!this.process) {
            return;
        }

        return new Promise((resolve) => {
            if (!this.process) {
                resolve();
                return;
            }

            console.log(`🛑 Stopping OpenRGB (PID: ${this.process.pid})...`);

            // Set timeout for force kill
            const forceKillTimeout = setTimeout(() => {
                if (this.process && !this.process.killed) {
                    console.log('   Force killing OpenRGB...');
                    this.process.kill('SIGKILL');
                }
            }, 5000);

            // Handle exit
            this.process.once('exit', () => {
                clearTimeout(forceKillTimeout);
                console.log('✅ OpenRGB stopped');
                this.process = null;
                resolve();
            });

            // Send kill signal
            this.process.kill(signal);
        });
    }

    /**
     * Cleanup - called on shutdown
     */
    async cleanup(): Promise<void> {
        if (this.isRunning()) {
            await this.kill();
        }
    }
}
