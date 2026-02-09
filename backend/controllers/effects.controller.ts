import { RGBColor, hexToRgb, hslToRgb } from '../utils/color.utils';
import openrgb from './openrgb.controller';

type EffectType = 'static' | 'breathing' | 'rainbow' | 'spectrum' | 'strobing' | 'custom';

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
    private fps: number = 30; // Frames per second

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
                await openrgb.setDeviceMode(device.id, 0); // 0 is usually Direct Mode
            } catch (error) {
                console.error(`Failed to set Direct Mode for device ${device.id}`, error);
            }
        }
    }

    async startEffect(type: EffectType, options: EffectOptions = {}) {
        // Stop existing effect
        this.stopEffect();

        console.log(`✨ Starting Effect: ${type}`, options);

        // Prepare devices
        await this.prepareDevices();

        const speed = options.speed || 50;
        const color = options.color ? hexToRgb(options.color) : { red: 255, green: 0, blue: 0 };

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
            this.currentEffect = null;
            console.log('🛑 Effect stopped');
        }
    }

    private tick(type: EffectType, options: EffectOptions) {
        if (!this.devices.length) return;

        const time = Date.now() - (this.currentEffect?.startTime || 0);
        const speed = (options.speed || 50) / 50; // Normalize to around 1.0

        // Calculate global color for this frame
        let frameColor: RGBColor;

        switch (type) {
            case 'breathing':
                frameColor = this.calculateBreathing(time, speed, options.color || '#FF0000');
                break;
            case 'rainbow':
                frameColor = this.calculateRainbow(time, speed);
                break;
            case 'strobing':
                frameColor = this.calculateStrobing(time, speed, options.color || '#FFFFFF');
                break;
            case 'spectrum':
                frameColor = this.calculateSpectrum(time, speed);
                break;
            case 'custom':
                frameColor = this.calculateCustom(time, speed, options.colors || ['#FF0000', '#0000FF']);
                break;
            case 'static':
            default:
                frameColor = hexToRgb(options.color || '#FFFFFF');
                this.stopEffect(); // Static only needs one update
                break;
        }

        // Apply to all devices
        this.applyColorToAll(frameColor);
    }

    private applyColorToAll(color: RGBColor) {
        this.devices.forEach(device => {
            // Create array of colors for this device (all LEDs same color for now)
            // Future: Per-LED effects
            const colors = Array(device.ledCount).fill(color);
            openrgb.updateLeds(device.id, colors);
        });
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

    private calculateRainbow(time: number, speed: number): RGBColor {
        // Cycle Hue 0-360
        const period = 5000 / speed;
        const hue = ((time % period) / period) * 360;
        return hslToRgb(hue, 1, 0.5);
    }

    private calculateSpectrum(time: number, speed: number): RGBColor {
        // Slower rainbow
        return this.calculateRainbow(time, speed * 0.5);
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
            options: this.currentEffect?.options
        };
    }
}

export default new EffectsEngine();
