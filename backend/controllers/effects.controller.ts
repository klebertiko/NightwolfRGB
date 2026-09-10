import { RGBColor, hexToRgb, hslToRgb } from '../utils/color.utils';
import openrgb from './openrgb.controller';
import layout from './layout.controller';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { engine } = require('../../scripts/lighting-engine.cjs') as { engine: any };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const canvasLayout = require('../../scripts/canvas-layout.cjs') as {
    paintCanvasFrame: (
        layout: any,
        timeMs: number,
        speed?: number,
    ) => Array<{ id: string; colors: RGBColor[] }>;
    ledNormFromZones: (zones: any[]) => Record<number, { nx: number; ny: number }>;
};

type EffectType = 'static' | 'breathing' | 'rainbow' | 'spectrum' | 'strobing' | 'custom' | 'canvas-wave';

interface EffectOptions {
    speed?: number; // 1-100
    color?: string; // Hex
    colors?: string[]; // Array of Hex
    brightness?: number; // 0-100
}

interface RunningEffect {
    type: EffectType;
    options: EffectOptions;
    interval: NodeJS.Timeout | null;
    startTime: number;
}

class EffectsEngine {
    private currentEffect: RunningEffect | null = null;
    private devices: any[] = [];
    private fps: number = 20;
    private busy = false;

    constructor() {
        this.currentEffect = null;
    }

    // Initialize devices for effects (set to Direct Mode)
    private async prepareDevices() {
        const devices = await openrgb.refreshDevices();
        this.devices = devices;

        // Use a for...of loop to await properly
        for (const device of devices) {
            try {
                await openrgb.setPaintMode(device.id);
            } catch (error) {
                console.error(`Failed to set paint mode for device ${device.id}`, error);
            }
        }
    }

    async startEffect(type: EffectType, options: EffectOptions = {}) {
        engine.assertEnabled(); // throws ENGINE_OFF if engine is disabled
        this.stopEffect();

        console.log(`✨ Starting Effect: ${type}`, options);

        await this.prepareDevices();

        if (!this.devices.length) {
            throw new Error('Nenhum device RGB para animar');
        }

        const color = options.color ? hexToRgb(options.color) : { red: 255, green: 0, blue: 0 };

        if (type === 'static') {
            this.currentEffect = { type, options, startTime: Date.now(), interval: null };
            void this.applyColorToAll(color);
            return { success: true, message: `Effect ${type} started` };
        }

        this.currentEffect = {
            type,
            options,
            startTime: Date.now(),
            interval: setInterval(() => this.tick(type, options), 1000 / this.fps)
        };

        return { success: true, message: `Effect ${type} started` };
    }

    stopEffect() {
        if (this.currentEffect?.interval) {
            clearInterval(this.currentEffect.interval);
        }
        if (this.currentEffect) {
            this.currentEffect = null;
            console.log('🛑 Effect stopped');
        }
    }

    private tick(type: EffectType, options: EffectOptions) {
        if (this.busy || !this.devices.length) return;
        this.busy = true;
        void this.paintFrame(type, options).finally(() => {
            this.busy = false;
        });
    }

    private async paintFrame(type: EffectType, options: EffectOptions) {
        const time = Date.now() - (this.currentEffect?.startTime || 0);
        const speed = (options.speed || 50) / 50;

        if (type === 'canvas-wave') {
            await this.applyCanvasWave(time, speed);
            return;
        }

        const spatial = type === 'rainbow' || type === 'spectrum';
        if (spatial) {
            const period = (type === 'spectrum' ? 10000 : 5000) / speed;
            await this.applyPerLed((i, n) => {
                const hue = ((time / period) * 360 + (n ? (i / n) * 360 : 0)) % 360;
                return hslToRgb(hue, 1, 0.5);
            });
            return;
        }

        let frameColor: RGBColor;
        switch (type) {
            case 'breathing':
                frameColor = this.calculateBreathing(time, speed, options.color || '#FF0000');
                break;
            case 'strobing':
                frameColor = this.calculateStrobing(time, speed, options.color || '#FFFFFF');
                break;
            case 'custom':
                frameColor = this.calculateCustom(time, speed, options.colors || ['#FF0000', '#0000FF']);
                break;
            case 'static':
            default:
                frameColor = hexToRgb(options.color || '#FFFFFF');
                break;
        }

        await this.applyColorToAll(frameColor);
    }

    private paintableCount(device: any): number {
        return Math.max(0, device.ledCount || device.leds?.length || 0);
    }

    private async applyColorToAll(color: RGBColor) {
        for (const device of this.devices) {
            const n = this.paintableCount(device);
            if (n === 0) continue;
            await openrgb.updateLeds(device.id, Array(n).fill(color));
        }
    }

    private async applyPerLed(fn: (ledIndex: number, ledCount: number) => RGBColor) {
        for (const device of this.devices) {
            const n = this.paintableCount(device);
            if (n === 0) continue;
            const colors = Array.from({ length: n }, (_, i) => fn(i, n));
            await openrgb.updateLeds(device.id, colors);
        }
    }

    /** Sample a shared canvas so waves flow continuously across placed devices. */
    private async applyCanvasWave(timeMs: number, speed: number) {
        const live = this.devices.map((d) => ({
            id: d.id,
            name: d.name,
            ledCount: this.paintableCount(d),
        }));
        const map = await layout.getOrAuto(live);
        const withNorm = {
            ...map,
            devices: (map.devices || []).map((p: any) => {
                const device = this.devices.find((d) => String(d.id) === String(p.id));
                const ledNorm = canvasLayout.ledNormFromZones(device?.zones || []);
                return Object.keys(ledNorm).length ? { ...p, ledNorm } : p;
            }),
        };
        const frames = canvasLayout.paintCanvasFrame(withNorm, timeMs, speed);
        const byId = new Map(frames.map((f) => [String(f.id), f.colors]));

        for (const device of this.devices) {
            const colors = byId.get(String(device.id));
            if (!colors?.length) continue;
            await openrgb.updateLeds(device.id, colors);
        }
    }

    // --- Effect Algorithms ---

    private calculateBreathing(time: number, speed: number, hexColor: string): RGBColor {
        const baseColor = hexToRgb(hexColor);
        // Sine wave: 0 to 1
        // Period depends on speed. Speed 1.0 = ~2 seconds period
        const period = 2000 / speed;
        const brightness = (Math.sin((time % period) / period * 2 * Math.PI) + 1) / 2; // 0.0 to 1.0

        return {
            red: Math.floor(baseColor.red * brightness),
            green: Math.floor(baseColor.green * brightness),
            blue: Math.floor(baseColor.blue * brightness)
        };
    }

    private calculateStrobing(time: number, speed: number, hexColor: string): RGBColor {
        const baseColor = hexToRgb(hexColor);
        const period = 500 / speed; // Fast flashing
        const on = (time % period) < (period / 2);

        return on ? baseColor : { red: 0, green: 0, blue: 0 };
    }

    private calculateCustom(time: number, speed: number, hexColors: string[]): RGBColor {
        if (!hexColors.length) return { red: 0, green: 0, blue: 0 };
        if (hexColors.length === 1) return hexToRgb(hexColors[0]);

        // Duration of one color transition
        const segmentDuration = 1000 / speed;
        const totalDuration = segmentDuration * hexColors.length;

        const cycleTime = time % totalDuration;
        const currentIndex = Math.floor(cycleTime / segmentDuration);
        const nextIndex = (currentIndex + 1) % hexColors.length;

        const progress = (cycleTime % segmentDuration) / segmentDuration; // 0.0 to 1.0

        const color1 = hexToRgb(hexColors[currentIndex]);
        const color2 = hexToRgb(hexColors[nextIndex]);

        return {
            red: Math.round(color1.red + (color2.red - color1.red) * progress),
            green: Math.round(color1.green + (color2.green - color1.green) * progress),
            blue: Math.round(color1.blue + (color2.blue - color1.blue) * progress)
        };
    }

    getStatus() {
        return {
            active: !!this.currentEffect,
            effect: this.currentEffect?.type || 'none',
            options: this.currentEffect?.options,
            engine: 'nightwolf-direct',
            audio: false,
            canvas: this.currentEffect?.type === 'canvas-wave',
        };
    }
}

export default new EffectsEngine();
