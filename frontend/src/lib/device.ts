import type { DeviceData, RGBColor } from '../types';

export const WASH_PRESETS = ['#c9897a', '#d45c5c', '#c4a35a', '#6f9e6a', '#4a7ea8', '#f3ead8'];

export function rgbToHex(color: RGBColor | undefined, fallback = '#ff4d8d') {
    if (!color) return fallback;
    const h = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, '0');
    return `#${h(color.red)}${h(color.green)}${h(color.blue)}`;
}

export function hexToRgb(hex: string): RGBColor {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
        ? { red: parseInt(m[1], 16), green: parseInt(m[2], 16), blue: parseInt(m[3], 16) }
        : { red: 0, green: 0, blue: 0 };
}

export function rgbCss(color: RGBColor | undefined, fallback = '#ff4d8d') {
    if (!color || typeof color !== 'object' || !('red' in color)) return fallback;
    return `rgb(${color.red},${color.green},${color.blue})`;
}

export function deviceWash(device: DeviceData, fallback = '#ff4d8d') {
    return rgbCss(device.colors?.[0], fallback);
}

export function deviceLeds(device: DeviceData, fallback: string, cap = 64) {
    const fromColors = (device.colors || []).map((c) => rgbCss(c, fallback));
    if (fromColors.length) return fromColors.slice(0, cap);
    const fromLeds = (device.leds || [])
        .map((led) => (typeof led.value === 'object' ? rgbCss(led.value, fallback) : fallback));
    if (fromLeds.length) return fromLeds.slice(0, cap);
    const n = Math.min(cap, Math.max(8, device.ledCount || 8));
    return Array.from({ length: n }, () => fallback);
}

const TYPE_LABEL: Record<number, string> = {
    0: 'Placa',
    1: 'DRAM',
    2: 'GPU',
    3: 'Cooler',
    4: 'Fita',
    5: 'Teclado',
    6: 'Mouse',
    7: 'Mousepad',
    8: 'Headset',
    9: 'Stand',
    10: 'Gamepad',
    11: 'Luz',
    12: 'Speaker',
    13: 'Virtual',
    14: 'Disco',
    15: 'RGB',
};

const ZONE_TYPE: Record<number, string> = {
    0: 'única',
    1: 'linear',
    2: 'matriz',
};

export function zoneKind(zone: { type?: number }): string {
    return ZONE_TYPE[zone.type ?? -1] || 'zona';
}

export function unusedHeaders(device: DeviceData) {
    return (device.zones || []).filter((z) => z.ledsCount === 0 && z.resizable);
}

export function ledHonesty(device: DeviceData) {
    const live = device.ledCount || device.leds?.length || 0;
    const idle = unusedHeaders(device).length;
    if (idle === 0) return `${live} LED`;
    return `${live} LED · ${idle} cabeçalho${idle === 1 ? '' : 's'} vazio${idle === 1 ? '' : 's'}`;
}

export function kindLabel(device: DeviceData) {
    if (typeof device.type === 'number' && TYPE_LABEL[device.type]) return TYPE_LABEL[device.type];
    const s = `${device.name} ${device.type || ''} ${device.vendor || ''}`.toLowerCase();
    if (/dram|dimm|ram|vengeance|trident|dominator/.test(s)) return 'DRAM';
    if (/gpu|geforce|radeon|rtx|graphics/.test(s)) return 'GPU';
    if (/motherboard|mainboard|aura|b550|b650|x670|z790/.test(s)) return 'Placa';
    if (/fan|cooler|aio|kraken|liquid|pump/.test(s)) return 'Cooler';
    if (/strip|header|argb/.test(s)) return 'Fita';
    if (/keyboard|keychron|k70|k100/.test(s)) return 'Teclado';
    if (/mouse/.test(s)) return 'Mouse';
    return 'RGB';
}

export function activeModeName(device: DeviceData) {
    return device.modes?.find((m) => m.id === device.activeMode)?.name;
}

export function groupByKind(devices: DeviceData[]) {
    const map = new Map<string, DeviceData[]>();
    for (const device of devices) {
        const kind = kindLabel(device);
        const bucket = map.get(kind);
        if (bucket) bucket.push(device);
        else map.set(kind, [device]);
    }
    return [...map.entries()];
}
