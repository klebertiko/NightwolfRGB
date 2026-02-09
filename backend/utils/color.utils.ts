/**
 * Color conversion utilities
 */

export interface RGBColor {
    red: number;
    green: number;
    blue: number;
}

export const hexToRgb = (hex: string): RGBColor => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        red: parseInt(result[1], 16),
        green: parseInt(result[2], 16),
        blue: parseInt(result[3], 16)
    } : { red: 0, green: 0, blue: 0 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const hslToRgb = (h: number, s: number, l: number): RGBColor => {
    h = h / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    return {
        red: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
        green: Math.round(hue2rgb(p, q, h) * 255),
        blue: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
    };
};

export const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
