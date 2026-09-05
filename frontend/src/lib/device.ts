import type { DeviceData, RGBColor } from '../types';

export function rgbCss(color: RGBColor | undefined, fallback = '#ff4d8d') {
    if (!color) return fallback;
    return `rgb(${color.red},${color.green},${color.blue})`;
}

export function deviceWash(device: DeviceData, fallback = '#ff4d8d') {
    return rgbCss(device.colors?.[0] || device.leds?.[0]?.value, fallback);
}

export function deviceLeds(device: DeviceData, fallback: string, cap = 64) {
    const fromColors = (device.colors || []).map((c) => rgbCss(c, fallback));
    if (fromColors.length) return fromColors.slice(0, cap);
    const fromLeds = (device.leds || []).map((led) => rgbCss(led.value, fallback));
    if (fromLeds.length) return fromLeds.slice(0, cap);
    const n = Math.min(cap, Math.max(8, device.ledCount || 8));
    return Array.from({ length: n }, () => fallback);
}

export function kindLabel(device: DeviceData) {
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
