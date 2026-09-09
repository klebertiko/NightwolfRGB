/**
 * Maps an OpenRGB SDK Device into the Nightwolf DTO.
 * Pure: no I/O. The SDK already parsed protocol v1–v5 fields.
 */

export interface MappedSegment {
    id: number;
    name: string;
    type: number;
    ledsStart: number;
    ledsCount: number;
}

export interface MappedZone {
    id: number;
    name: string;
    type: number;
    ledsCount: number;
    ledsStart: number;
    ledsMin: number;
    ledsMax: number;
    resizable: boolean;
    matrix: { height: number; width: number; map: (number | null)[][] } | null;
    segments: MappedSegment[];
    flags: number;
    flagList: string[];
}

export interface MappedMode {
    id: number;
    name: string;
    value: number;
    flags: number;
    flagList: string[];
    colorMode: number;
    colors: { red: number; green: number; blue: number }[];
    speed: number;
    speed_min: number;
    speed_max: number;
    brightness: number;
    brightness_min: number;
    brightness_max: number;
    direction: number;
    colors_min: number;
    colors_max: number;
}

export interface MappedDevice {
    id: number;
    name: string;
    type: number;
    vendor?: string;
    description: string;
    version: string;
    location: string;
    serial: string;
    modes: MappedMode[];
    activeMode: number;
    leds: { id: number; name: string; value: number }[];
    zones: MappedZone[];
    colors: { red: number; green: number; blue: number }[];
    ledCount: number;
    flags: number;
    flagList: string[];
}

export function mapOpenRgbDevice(device: any, index: number): MappedDevice {
    let ledOffset = 0;
    const zones: MappedZone[] = (device.zones || []).map((zone: any, zIdx: number) => {
        const ledsCount = zone.ledsCount ?? 0;
        const ledsMin = zone.ledsMin ?? 0;
        const ledsMax = zone.ledsMax ?? ledsCount;
        const matrixSrc = zone.matrix;
        const matrix = matrixSrc
            ? {
                height: matrixSrc.height ?? 0,
                width: matrixSrc.width ?? 0,
                map: (matrixSrc.keys ?? matrixSrc.map ?? []).map((row: (number | undefined | null)[]) =>
                    (row || []).map((cell) => (cell === undefined || cell === 0xffffffff ? null : cell)),
                ),
            }
            : null;

        const entry: MappedZone = {
            id: zone.id ?? zIdx,
            name: zone.name ?? `Zona ${zIdx}`,
            type: zone.type ?? 0,
            ledsCount,
            ledsStart: ledOffset,
            ledsMin,
            ledsMax,
            resizable: zone.resizable ?? ledsMin !== ledsMax,
            matrix,
            segments: (zone.segments || []).map((seg: any, sIdx: number) => ({
                id: sIdx,
                name: seg.name ?? `Segmento ${sIdx}`,
                type: seg.type ?? zone.type ?? 0,
                ledsStart: seg.start ?? seg.ledsStart ?? 0,
                ledsCount: seg.length ?? seg.ledsCount ?? 0,
            })),
            flags: zone.flags ?? 0,
            flagList: zone.flagList ?? [],
        };
        ledOffset += ledsCount;
        return entry;
    });

    const altNames: string[] | undefined = device.alternateLEDsNames;
    const leds = (device.leds || []).map((led: any, idx: number) => ({
        id: idx,
        name: altNames?.[idx] || led.name || `LED ${idx}`,
        value: led.value,
    }));

    return {
        id: index,
        name: device.name,
        type: device.type,
        vendor: device.vendor,
        description: device.description,
        version: device.version ?? '',
        location: device.location,
        serial: device.serial,
        modes: (device.modes || []).map((mode: any, idx: number) => ({
            id: mode.id ?? idx,
            name: mode.name,
            value: mode.value,
            flags: mode.flags ?? 0,
            flagList: mode.flagList ?? [],
            colorMode: mode.colorMode ?? 0,
            colors: mode.colors ?? [],
            speed: mode.speed ?? 0,
            speed_min: mode.speedMin ?? 0,
            speed_max: mode.speedMax ?? 0,
            brightness: mode.brightness ?? 0,
            brightness_min: mode.brightnessMin ?? 0,
            brightness_max: mode.brightnessMax ?? 0,
            direction: mode.direction ?? 0,
            colors_min: mode.colorMin ?? mode.colorsMin ?? 0,
            colors_max: mode.colorMax ?? mode.colorsMax ?? 0,
        })),
        activeMode: device.activeMode,
        leds,
        zones,
        colors: device.colors || [],
        ledCount: leds.length,
        flags: device.flags ?? 0,
        flagList: device.flagList ?? [],
    };
}
