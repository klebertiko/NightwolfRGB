import { Client } from 'openrgb-sdk';
import { hexToRgb, RGBColor } from '../utils/color.utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { engine } = require('../../scripts/lighting-engine.cjs') as { engine: any };

export class OpenRGBController {
    private client: any | null; // openrgb-sdk types might not be exported perfectly, using any for client temporarily or Client if typed
    public connected: boolean;
    private devices: any[];
    private reconnectInterval: NodeJS.Timeout | null;
    private sdkHost: string = 'localhost';
    private sdkPort: number = 6742;
    private lastPaint: RGBColor = { red: 200, green: 224, blue: 74 };

    constructor() {
        this.client = null;
        this.connected = false;
        this.devices = [];
        this.reconnectInterval = null;
    }

    async connect(host: string = 'localhost', port: number = 6742): Promise<boolean> {
        this.sdkHost = host;
        this.sdkPort = port;
        try {
            this.client = new Client('Nightwolf RGB', port, host);
            await this.client.connect();
            this.connected = true;
            console.log('✅ Connected to OpenRGB SDK Server');
            await this.refreshDevices();
            return true;
        } catch (error: any) {
            console.error('❌ Failed to connect to OpenRGB:', error.message);
            this.connected = false;
            return false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client && this.connected) {
            await this.client.disconnect();
            this.connected = false;
            console.log('Disconnected from OpenRGB');
        }
    }

    async refreshDevices(): Promise<any[]> {
        if (!this.connected || !this.client) return [];

        try {
            const count = await this.client.getControllerCount();
            this.devices = [];

            for (let i = 0; i < count; i++) {
                const device = await this.client.getControllerData(i);
                this.devices.push({
                    id: i,
                    name: device.name,
                    type: device.type,
                    vendor: device.vendor,
                    description: device.description,
                    location: device.location,
                    serial: device.serial,
                    modes: device.modes.map((mode: any, idx: number) => ({
                        id: idx,
                        name: mode.name,
                        value: mode.value,
                        flags: mode.flags,
                        colorMode: mode.colorMode,
                        colors: mode.colors
                    })),
                    activeMode: device.activeMode,
                    leds: device.leds.map((led: any, idx: number) => ({
                        id: idx,
                        name: led.name,
                        value: led.value
                    })),
                    zones: device.zones,
                    colors: device.colors,
                    ledCount: device.leds.length
                });
            }

            return this.devices;
        } catch (error: any) {
            console.error('Error refreshing devices:', error.message);
            return [];
        }
    }

    async updateLeds(deviceId: number, colors: RGBColor[]): Promise<void> {
        if (!this.connected || !this.client) return; // Fail silently for performance in loops
        if (!engine.isEnabled()) return; // Engine off: skip paint tick
        try {
            await this.client.updateLeds(deviceId, colors);
        } catch (error) {
            // Ignore errors in high-frequency loop to prevent crashing
            // console.error(`Error updating LEDs for device ${deviceId}`, error);
        }
    }

    async setDeviceColor(deviceId: number, color: string | RGBColor, brightness = 100, _bypassEngine = false): Promise<{ success: boolean; deviceId: number; color?: RGBColor; error?: string }> {
        if (!this.connected || !this.client) throw new Error('Not connected to OpenRGB');
        if (!_bypassEngine) engine.assertEnabled();

        const rgb = typeof color === 'string' ? hexToRgb(color) : color;
        const device = this.devices[deviceId];

        if (!device) throw new Error(`Device ${deviceId} not found`);

        try {
            const modeId = this.resolvePaintMode(device);
            await this.client.updateMode(deviceId, modeId);

            const scale = Math.min(100, Math.max(0, brightness)) / 100;
            const painted = {
                red: Math.round(rgb.red * scale),
                green: Math.round(rgb.green * scale),
                blue: Math.round(rgb.blue * scale),
            };
            const colors = Array(device.ledCount).fill(painted);
            await this.client.updateLeds(deviceId, colors);

            this.lastPaint = rgb;
            return { success: true, deviceId, color: painted };
        } catch (error: any) {
            console.error(`Error setting device ${deviceId} color:`, error.message);
            throw error;
        }
    }

    private resolvePaintMode(device: any): number {
        const modes: { id: number; name?: string }[] = device.modes || [];
        const byName = (re: RegExp) => modes.find((mode) => re.test(String(mode.name || '')));
        return byName(/direct/i)?.id ?? byName(/^static$/i)?.id ?? (typeof device.activeMode === 'number' ? device.activeMode : 0);
    }

    async setAllDevicesColor(color: string | RGBColor, brightness = 100, _bypassEngine = false): Promise<any[]> {
        if (!this.connected) throw new Error('Not connected to OpenRGB');
        if (!_bypassEngine) engine.assertEnabled();

        const results = [];
        for (let i = 0; i < this.devices.length; i++) {
            try {
                const result = await this.setDeviceColor(i, color, brightness, true /* inner call: already checked */);
                results.push(result);
            } catch (error: any) {
                results.push({ success: false, deviceId: i, error: error.message });
            }
        }
        return results;
    }

    /**
     * Paint all devices black without engine check and without touching lastPaint.
     * Used when the engine is turned off so the restore color is preserved.
     */
    async paintOff(): Promise<any[]> {
        if (!this.connected || !this.client) return [];
        const black: RGBColor = { red: 0, green: 0, blue: 0 };
        const results = [];
        for (let i = 0; i < this.devices.length; i++) {
            try {
                const device = this.devices[i];
                if (!device) continue;
                const modeId = this.resolvePaintMode(device);
                await this.client.updateMode(i, modeId);
                const colors = Array(device.ledCount).fill(black);
                await this.client.updateLeds(i, colors);
                results.push({ success: true, deviceId: i });
            } catch (error: any) {
                results.push({ success: false, deviceId: i, error: error.message });
            }
        }
        return results;
        // NOTE: lastPaint intentionally NOT updated — preserved for restore on re-enable
    }

    getLastPaint(): RGBColor {
        return this.lastPaint;
    }

    async setDeviceMode(deviceId: number, modeId: number): Promise<{ success: boolean; deviceId: number; modeId: number }> {
        if (!this.connected || !this.client) throw new Error('Not connected to OpenRGB');

        await this.client.updateMode(deviceId, modeId);
        return { success: true, deviceId, modeId };
    }

    async setPaintMode(deviceId: number): Promise<void> {
        if (!this.connected || !this.client) return;
        const device = this.devices[deviceId];
        if (!device) return;
        await this.client.updateMode(deviceId, this.resolvePaintMode(device));
    }

    async setDeviceBrightness(deviceId: number, brightness: number): Promise<{ success: boolean; deviceId: number; brightness: number }> {
        engine.assertEnabled();
        await this.setDeviceColor(deviceId, this.lastPaint, brightness, true /* already checked */);
        return { success: true, deviceId, brightness };
    }

    getStatus(): any {
        return {
            connected: this.connected,
            deviceCount: this.devices.length,
            devices: this.devices.map(d => ({ id: d.id, name: d.name, type: d.type }))
        };
    }
}

export default new OpenRGBController();
