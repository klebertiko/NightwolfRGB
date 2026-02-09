import { Client } from 'openrgb-sdk';
import { hexToRgb, RGBColor } from '../utils/color.utils';

export class OpenRGBController {
    private client: any | null; // openrgb-sdk types might not be exported perfectly, using any for client temporarily or Client if typed
    public connected: boolean;
    private devices: any[];
    private reconnectInterval: NodeJS.Timeout | null;
    private sdkHost: string = 'localhost';
    private sdkPort: number = 6742;

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
        try {
            await this.client.updateLeds(deviceId, colors);
        } catch (error) {
            // Ignore errors in high-frequency loop to prevent crashing
            // console.error(`Error updating LEDs for device ${deviceId}`, error);
        }
    }

    async setDeviceColor(deviceId: number, color: string | RGBColor): Promise<{ success: boolean; deviceId: number; color?: RGBColor; error?: string }> {
        if (!this.connected || !this.client) throw new Error('Not connected to OpenRGB');

        const rgb = typeof color === 'string' ? hexToRgb(color) : color;
        const device = this.devices[deviceId];

        if (!device) throw new Error(`Device ${deviceId} not found`);

        try {
            // Set to direct mode (usually mode 0)
            await this.client.updateMode(deviceId, 0);

            // Fill all LEDs with the same color
            const colors = Array(device.ledCount).fill(rgb);
            await this.client.updateLeds(deviceId, colors);

            return { success: true, deviceId, color: rgb };
        } catch (error: any) {
            console.error(`Error setting device ${deviceId} color:`, error.message);
            throw error;
        }
    }

    async setAllDevicesColor(color: string | RGBColor): Promise<any[]> {
        if (!this.connected) throw new Error('Not connected to OpenRGB');

        const results = [];
        for (let i = 0; i < this.devices.length; i++) {
            try {
                const result = await this.setDeviceColor(i, color);
                results.push(result);
            } catch (error: any) {
                results.push({ success: false, deviceId: i, error: error.message });
            }
        }
        return results;
    }

    async setDeviceMode(deviceId: number, modeId: number): Promise<{ success: boolean; deviceId: number; modeId: number }> {
        if (!this.connected || !this.client) throw new Error('Not connected to OpenRGB');

        await this.client.updateMode(deviceId, modeId);
        return { success: true, deviceId, modeId };
    }

    async setDeviceBrightness(deviceId: number, brightness: number): Promise<{ success: boolean; deviceId: number; brightness: number }> {
        if (!this.connected || !this.client) throw new Error('Not connected to OpenRGB');

        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} not found`);

        // Brightness is applied by scaling RGB values
        const scaledColors = device.colors.map((color: RGBColor) => ({
            red: Math.round(color.red * (brightness / 100)),
            green: Math.round(color.green * (brightness / 100)),
            blue: Math.round(color.blue * (brightness / 100))
        }));

        await this.client.updateLeds(deviceId, scaledColors);
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
