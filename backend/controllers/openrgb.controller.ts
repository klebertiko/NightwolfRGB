import { Client } from 'openrgb-sdk';
import { hexToRgb, RGBColor } from '../utils/color.utils';
import { mapOpenRgbDevice } from '../lib/map-openrgb-device';
import {
    encodeFxPacket,
    FX_REQUEST_EFFECT_LIST,
    FX_START_EFFECT,
    FX_STOP_EFFECT,
    isEffectsPlugin,
    parseEffectList,
    parsePluginList,
    writeCString,
    type OpenRgbPlugin,
    type PluginEffect,
} from '../lib/openrgb-plugins';
export {
    MODE_FLAG_HAS_SPEED,
    MODE_FLAG_HAS_DIRECTION_LR,
    MODE_FLAG_HAS_DIRECTION_UD,
    MODE_FLAG_HAS_DIRECTION_HV,
    MODE_FLAG_HAS_BRIGHTNESS,
    MODE_FLAG_HAS_PER_LED_COLOR,
    MODE_FLAG_HAS_MODE_SPECIFIC_COLOR,
    MODE_FLAG_HAS_RANDOM_COLOR,
    MODE_FLAG_MANUAL_SAVE,
    MODE_FLAG_AUTOMATIC_SAVE,
} from '../lib/openrgb-flags';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { engine } = require('../../scripts/lighting-engine.cjs') as { engine: any };

function zoneIndex(device: any, zoneId: number): number {
    const zones: { id?: number }[] = device?.zones || [];
    const byId = zones.findIndex((z) => z.id === zoneId);
    if (byId >= 0) return byId;
    throw new Error(`Zona ${zoneId} não encontrada no device ${device?.id}`);
}

function scalePaint(rgb: RGBColor, brightness: number): RGBColor {
    const scale = Math.min(100, Math.max(0, brightness)) / 100;
    return {
        red: Math.round(rgb.red * scale),
        green: Math.round(rgb.green * scale),
        blue: Math.round(rgb.blue * scale),
    };
}

const ORP_NAME = /^[A-Za-z0-9._-]{1,64}$/;

function assertOrpName(name: string): string {
    const n = String(name || '').trim();
    if (n.includes('\\') || n.includes('/') || n.includes('..') || !ORP_NAME.test(n)) {
        throw new Error('Nome de perfil OpenRGB inválido');
    }
    return n;
}

/** One-slot queue: send+read from the same caller stay paired; two HTTP plugin routes cannot interleave on TCP. */
function wrapClientQueue(client: any) {
    const send = client.sendMessage.bind(client);
    const read = client.readMessage.bind(client);
    let chain: Promise<unknown> = Promise.resolve();
    const exclusive = <T,>(fn: () => T | Promise<T>): Promise<T> => {
        const run = chain.then(fn, fn);
        chain = run.then(() => undefined, () => undefined);
        return run;
    };
    client.sendMessage = (commandId: number, buffer?: Buffer, deviceId?: number) => {
        void exclusive(() => send(commandId, buffer, deviceId));
    };
    client.readMessage = (commandId: number, deviceId?: number) =>
        exclusive(() => read(commandId, deviceId));
}

/**
 * openrgb-sdk skips 0 with `if (mode.speed)` (and the same for brightness,
 * direction, colorMode). A sub-1 float is truthy and packs as uint32 0.
 */
function sdkZeroSafe(n: number | undefined): number | undefined {
    if (n === undefined) return undefined;
    return n === 0 ? Number.MIN_VALUE : n;
}

export class OpenRGBController {
    private client: any | null;
    public connected: boolean;
    private devices: any[];
    private reconnectInterval: NodeJS.Timeout | null;
    private sdkHost: string = '127.0.0.1';
    private sdkPort: number = 6742;
    private lastPaint: RGBColor = { red: 200, green: 224, blue: 74 };
    private listListeners: Array<() => void> = [];
    private paintReady = new Set<number>();

    constructor() {
        this.client = null;
        this.connected = false;
        this.devices = [];
        this.reconnectInterval = null;
    }

    onDeviceListUpdated(fn: () => void): void {
        this.listListeners.push(fn);
    }

    async connect(host: string = '127.0.0.1', port: number = 6742): Promise<boolean> {
        this.sdkHost = host;
        this.sdkPort = port;
        try {
            this.client = new Client('Nightwolf RGB', port, host);
            await this.client.connect();
            wrapClientQueue(this.client);
            this.connected = true;
            this.paintReady.clear();
            this.client.on('deviceListUpdated', () => {
                void this.refreshDevices().then(() => {
                    this.listListeners.forEach((fn) => fn());
                });
            });
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
            this.paintReady.clear();

            for (let i = 0; i < count; i++) {
                const device = await this.client.getControllerData(i);
                this.devices.push(mapOpenRgbDevice(device, i));
            }

            return this.devices;
        } catch (error: any) {
            console.error('Error refreshing devices:', error.message);
            return [];
        }
    }

    async getDevices(refresh = false): Promise<any[]> {
        if (refresh) return this.refreshDevices();
        return this.devices;
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
            this.paintReady.add(deviceId);

            const painted = scalePaint(rgb, brightness);
            const colors = Array(device.ledCount).fill(painted);
            await this.client.updateLeds(deviceId, colors);
            device.colors = colors;

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

    private async ensurePaintMode(deviceId: number, device: any): Promise<void> {
        if (this.paintReady.has(deviceId)) return;
        await this.client.updateMode(deviceId, this.resolvePaintMode(device));
        this.paintReady.add(deviceId);
    }

    private patchDeviceColors(device: any, start: number, colors: RGBColor[]): void {
        if (!Array.isArray(device.colors)) device.colors = [];
        for (let i = 0; i < colors.length; i++) {
            device.colors[start + i] = colors[i];
        }
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
        this.paintReady.delete(deviceId);
        return { success: true, deviceId, modeId };
    }

    async setPaintMode(deviceId: number): Promise<void> {
        if (!this.connected || !this.client) return;
        const device = this.devices[deviceId];
        if (!device) return;
        await this.client.updateMode(deviceId, this.resolvePaintMode(device));
        this.paintReady.add(deviceId);
    }

    async setDeviceBrightness(deviceId: number, brightness: number): Promise<{ success: boolean; deviceId: number; brightness: number }> {
        engine.assertEnabled();
        await this.setDeviceColor(deviceId, this.lastPaint, brightness, true /* already checked */);
        return { success: true, deviceId, brightness };
    }

    // ─────────────────────────────────────────────
    // Rescan devices
    // ─────────────────────────────────────────────

    async rescanDevices(): Promise<{ success: boolean; deviceCount: number }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        // Fire-and-forget from SDK side; wait for OpenRGB to re-enumerate
        this.client.requestRescan();
        await new Promise<void>((resolve) => setTimeout(resolve, 2500));
        const devices = await this.refreshDevices();
        return { success: true, deviceCount: devices.length };
    }

    // ─────────────────────────────────────────────
    // Zone-level color
    // ─────────────────────────────────────────────

    async setZoneColor(
        deviceId: number,
        zoneId: number,
        color: string | RGBColor,
        brightness = 100,
    ): Promise<{ success: boolean; deviceId: number; zoneId: number; color: RGBColor }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        engine.assertEnabled();

        const rgb = typeof color === 'string' ? hexToRgb(color) : color;
        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} não encontrado`);

        const zIdx = zoneIndex(device, zoneId);
        const zone = device.zones[zIdx];
        const painted = scalePaint(rgb, brightness);

        await this.ensurePaintMode(deviceId, device);

        const colors = Array(zone.ledsCount).fill(painted);
        await this.client.updateZoneLeds(deviceId, zIdx, colors);
        this.patchDeviceColors(device, zone.ledsStart, colors);

        this.lastPaint = rgb;
        return { success: true, deviceId, zoneId, color: painted };
    }

    // ─────────────────────────────────────────────
    // Per-LED color
    // ─────────────────────────────────────────────

    async setSingleLed(
        deviceId: number,
        ledId: number,
        color: string | RGBColor,
        brightness = 100,
    ): Promise<{ success: boolean; deviceId: number; ledId: number; color: RGBColor }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        engine.assertEnabled();

        const rgb = typeof color === 'string' ? hexToRgb(color) : color;
        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} não encontrado`);

        if (ledId < 0 || ledId >= (device.ledCount ?? 0)) {
            throw new Error(`LED ${ledId} fora do range (0–${(device.ledCount ?? 1) - 1})`);
        }

        const painted = scalePaint(rgb, brightness);

        await this.ensurePaintMode(deviceId, device);
        await this.client.updateSingleLed(deviceId, ledId, painted);
        this.patchDeviceColors(device, ledId, [painted]);

        this.lastPaint = rgb;
        return { success: true, deviceId, ledId, color: painted };
    }

    // ─────────────────────────────────────────────
    // Mode with full parameters (speed, brightness, direction, colors)
    // ─────────────────────────────────────────────

    async setDeviceModeWithParams(
        deviceId: number,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: RGBColor[]; colorMode?: number } = {},
        save = false,
    ): Promise<{ success: boolean; deviceId: number; modeId: number; saved: boolean; device?: any }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');

        const modeInput: any = {
            id: modeId,
            speed: sdkZeroSafe(params.speed),
            brightness: sdkZeroSafe(params.brightness),
            direction: sdkZeroSafe(params.direction),
            colorMode: sdkZeroSafe(params.colorMode),
            colors: params.colors,
        };
        if (save) await this.client.saveMode(deviceId, modeInput);
        else await this.client.updateMode(deviceId, modeInput);
        this.paintReady.delete(deviceId);
        await this.refreshDevices();
        return { success: true, deviceId, modeId, saved: save, device: this.devices[deviceId] };
    }

    async saveDeviceMode(
        deviceId: number,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: RGBColor[]; colorMode?: number } = {},
    ): Promise<{ success: boolean; deviceId: number; modeId: number; saved: boolean }> {
        return this.setDeviceModeWithParams(deviceId, modeId, params, true);
    }

    async resizeZone(
        deviceId: number,
        zoneId: number,
        length: number,
    ): Promise<{ success: boolean; deviceId: number; zoneId: number; length: number }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');

        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} não encontrado`);
        const zIdx = zoneIndex(device, zoneId);
        const zone = device.zones[zIdx];
        if (!zone.resizable) throw new Error(`Zona ${zone.name} não é redimensionável`);

        const next = Math.max(zone.ledsMin, Math.min(zone.ledsMax, Math.round(length)));
        this.client.resizeZone(deviceId, zIdx, next);
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        await this.refreshDevices();
        return { success: true, deviceId, zoneId, length: next };
    }

    async setSegmentColor(
        deviceId: number,
        zoneId: number,
        segmentId: number,
        color: string | RGBColor,
        brightness = 100,
    ): Promise<{ success: boolean; deviceId: number; zoneId: number; segmentId: number; color: RGBColor }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        engine.assertEnabled();

        const rgb = typeof color === 'string' ? hexToRgb(color) : color;
        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} não encontrado`);
        const zIdx = zoneIndex(device, zoneId);
        const zone = device.zones[zIdx];
        const segment = zone.segments?.[segmentId];
        if (!segment) throw new Error(`Segmento ${segmentId} não encontrado na zona ${zoneId}`);

        const painted = scalePaint(rgb, brightness);

        await this.ensurePaintMode(deviceId, device);

        const zoneColors: RGBColor[] = (device.colors || [])
            .slice(zone.ledsStart, zone.ledsStart + zone.ledsCount)
            .map((c: RGBColor) => ({ red: c.red, green: c.green, blue: c.blue }));
        while (zoneColors.length < zone.ledsCount) {
            zoneColors.push({ red: 0, green: 0, blue: 0 });
        }
        for (let i = 0; i < segment.ledsCount; i++) {
            const idx = segment.ledsStart + i;
            if (idx >= 0 && idx < zoneColors.length) zoneColors[idx] = painted;
        }
        await this.client.updateZoneLeds(deviceId, zIdx, zoneColors);
        this.patchDeviceColors(device, zone.ledsStart, zoneColors);
        this.lastPaint = rgb;
        return { success: true, deviceId, zoneId, segmentId, color: painted };
    }

    async addSegment(
        deviceId: number,
        zoneId: number,
        name: string,
        start: number,
        length: number,
    ): Promise<{ success: boolean; deviceId: number; zoneId: number }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} não encontrado`);
        const zIdx = zoneIndex(device, zoneId);
        const zone = device.zones[zIdx];
        if (!name.trim()) throw new Error('Nome do segmento não pode ser vazio');
        const type = zone.type ?? 0;
        this.client.addSegment(deviceId, zIdx, name.trim(), type, start, length);
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        await this.refreshDevices();
        return { success: true, deviceId, zoneId };
    }

    async clearSegments(
        deviceId: number,
        zoneId: number,
    ): Promise<{ success: boolean; deviceId: number; zoneId: number }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        const device = this.devices[deviceId];
        if (!device) throw new Error(`Device ${deviceId} não encontrado`);
        const zIdx = zoneIndex(device, zoneId);
        this.client.clearSegments(deviceId, zIdx);
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        await this.refreshDevices();
        return { success: true, deviceId, zoneId };
    }

    // ─────────────────────────────────────────────
    // Native OpenRGB profiles (saved on-disk by OpenRGB)
    // ─────────────────────────────────────────────

    async getNativeProfiles(): Promise<string[]> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        return await this.client.getProfileList();
    }

    async saveNativeProfile(name: string): Promise<{ success: boolean; name: string }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        const safe = assertOrpName(name);
        this.client.saveProfile(safe);
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        return { success: true, name: safe };
    }

    async loadNativeProfile(name: string): Promise<{ success: boolean; name: string }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        const safe = assertOrpName(name);
        this.client.loadProfile(safe);
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        await this.refreshDevices();
        return { success: true, name: safe };
    }

    async deleteNativeProfile(name: string): Promise<{ success: boolean; name: string }> {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        const safe = assertOrpName(name);
        this.client.deleteProfile(safe);
        await new Promise<void>((resolve) => setTimeout(resolve, 300));
        return { success: true, name: safe };
    }

    // ─────────────────────────────────────────────
    // Plugins — protocol 200 / 201 (v4+)
    // ─────────────────────────────────────────────

    private assertClient(): any {
        if (!this.connected || !this.client) throw new Error('Não conectado ao OpenRGB');
        return this.client;
    }

    async getPluginList(): Promise<OpenRgbPlugin[]> {
        const client = this.assertClient();
        const proto = client.protocolVersion ?? 0;
        if (proto < 4) return [];
        client.sendMessage(200);
        const buffer: Buffer = await Promise.race([
            client.readMessage(200) as Promise<Buffer>,
            new Promise<Buffer>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout na lista de plugins')), 2500),
            ),
        ]);
        return parsePluginList(buffer);
    }

    async findEffectsPlugin(): Promise<OpenRgbPlugin | null> {
        const plugins = await this.getPluginList();
        return plugins.find(isEffectsPlugin) ?? null;
    }

    async getEffectsPluginEffects(): Promise<{
        available: boolean;
        plugin: OpenRgbPlugin | null;
        plugins: OpenRgbPlugin[];
        effects: PluginEffect[];
        reason?: string;
    }> {
        const plugins = await this.getPluginList();
        const plugin = plugins.find(isEffectsPlugin) ?? null;
        if (!plugin) {
            return {
                available: false,
                plugin: null,
                plugins,
                effects: [],
                reason: 'Plugin Effects não está carregado neste OpenRGB. Efeitos Nightwolf pintam via Direct.',
            };
        }
        const client = this.assertClient();
        const payload = encodeFxPacket(FX_REQUEST_EFFECT_LIST);
        client.sendMessage(201, payload, plugin.index);
        const buffer: Buffer = await Promise.race([
            client.readMessage(201, plugin.index) as Promise<Buffer>,
            new Promise<Buffer>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout no plugin Effects')), 2500),
            ),
        ]);
        return {
            available: true,
            plugin,
            plugins,
            effects: parseEffectList(buffer, plugin.protocolVersion),
        };
    }

    async startPluginEffect(name: string): Promise<{ success: boolean; name: string }> {
        const plugin = await this.findEffectsPlugin();
        if (!plugin) {
            const err: any = new Error('Plugin Effects não carregado no OpenRGB');
            err.code = 'NO_EFFECTS_PLUGIN';
            throw err;
        }
        const client = this.assertClient();
        client.sendMessage(201, encodeFxPacket(FX_START_EFFECT, writeCString(name)), plugin.index);
        return { success: true, name };
    }

    async stopPluginEffect(name: string): Promise<{ success: boolean; name: string }> {
        const plugin = await this.findEffectsPlugin();
        if (!plugin) {
            const err: any = new Error('Plugin Effects não carregado no OpenRGB');
            err.code = 'NO_EFFECTS_PLUGIN';
            throw err;
        }
        const client = this.assertClient();
        client.sendMessage(201, encodeFxPacket(FX_STOP_EFFECT, writeCString(name)), plugin.index);
        return { success: true, name };
    }

    getStatus(): any {
        return {
            connected: this.connected,
            deviceCount: this.devices.length,
            protocolVersion: this.client?.protocolVersion ?? null,
            sdkPort: this.sdkPort,
            devices: this.devices.map((d) => ({
                id: d.id,
                name: d.name,
                type: d.type,
                vendor: d.vendor,
                ledCount: d.ledCount,
                location: d.location,
            })),
        };
    }
}

export default new OpenRGBController();
