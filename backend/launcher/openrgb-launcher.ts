import { Socket } from 'net';
import { ProcessManager } from './process-manager';

/**
 * OpenRGB Launcher - Manages OpenRGB lifecycle
 */
export class OpenRGBLauncher {
    private processManager: ProcessManager;
    private sdkHost: string;
    private sdkPort: number;
    private autoStarted: boolean = false;

    constructor(sdkHost: string = 'localhost', sdkPort: number = 6742) {
        this.processManager = new ProcessManager();
        this.sdkHost = sdkHost;
        this.sdkPort = sdkPort;
    }

    /**
     * Check if SDK Server is responding on the specified port
     */
    async isSDKServerRunning(): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new Socket();
            let isConnected = false;

            socket.setTimeout(2000);

            socket.on('connect', () => {
                isConnected = true;
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });

            socket.connect(this.sdkPort, this.sdkHost);
        });
    }

    /**
     * Wait for SDK Server to become available
     */
    async waitForSDK(timeoutMs: number = 10000, intervalMs: number = 500): Promise<boolean> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (await this.isSDKServerRunning()) {
                return true;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }

        return false;
    }

    /**
     * Start OpenRGB process
     */
    async startOpenRGB(): Promise<void> {
        console.log('🔵 Starting OpenRGB...');

        try {
            // Args for OpenRGB:
            // --server: Enable SDK server
            // --noautoconnect: Don't auto-connect to devices (reduces startup time)
            const args = ['--server', '--noautoconnect'];

            this.processManager.spawn(args);
            this.autoStarted = true;

            console.log('   Waiting for SDK Server to be ready...');

            // Wait for SDK to be available
            const ready = await this.waitForSDK();

            if (ready) {
                console.log('✅ OpenRGB SDK Server is ready!');
            } else {
                throw new Error('SDK Server failed to start within timeout');
            }

        } catch (error) {
            console.error('❌ Failed to start OpenRGB:', error);
            throw error;
        }
    }

    /**
     * Stop OpenRGB (only if we started it)
     */
    async stopOpenRGB(): Promise<void> {
        if (!this.autoStarted) {
            console.log('ℹ️  OpenRGB was not auto-started, leaving it running');
            return;
        }

        if (this.processManager.isRunning()) {
            await this.processManager.kill();
        }
    }

    /**
     * Ensure OpenRGB is running (auto-start if needed)
     */
    async ensureOpenRGBRunning(): Promise<void> {
        console.log('🔍 Checking OpenRGB SDK Server...');

        // Check if already running
        const isRunning = await this.isSDKServerRunning();

        if (isRunning) {
            console.log('✅ OpenRGB SDK Server already running');
            this.autoStarted = false; // Don't stop it when we exit
            return;
        }

        console.log('⚠️  SDK Server not detected, auto-starting OpenRGB...');

        // Start OpenRGB
        await this.startOpenRGB();
    }

    /**
     * Cleanup - call this on shutdown
     */
    async cleanup(): Promise<void> {
        console.log('\n🧹 Cleaning up OpenRGB Launcher...');
        await this.stopOpenRGB();
    }

    /**
     * Get status information
     */
    getStatus(): {
        processRunning: boolean;
        autoStarted: boolean;
        pid?: number;
    } {
        return {
            processRunning: this.processManager.isRunning(),
            autoStarted: this.autoStarted,
            pid: this.processManager.getPID()
        };
    }
}
