/**
 * OpenRGB MODE_FLAG_* bits from RGBController.h.
 * Independent of the JS SDK — keep in lockstep with bundled OpenRGB.
 */
export const MODE_FLAG_HAS_SPEED = 1 << 0;
export const MODE_FLAG_HAS_DIRECTION_LR = 1 << 1;
export const MODE_FLAG_HAS_DIRECTION_UD = 1 << 2;
export const MODE_FLAG_HAS_DIRECTION_HV = 1 << 3;
export const MODE_FLAG_HAS_BRIGHTNESS = 1 << 4;
export const MODE_FLAG_HAS_PER_LED_COLOR = 1 << 5;
export const MODE_FLAG_HAS_MODE_SPECIFIC_COLOR = 1 << 6;
export const MODE_FLAG_HAS_RANDOM_COLOR = 1 << 7;
export const MODE_FLAG_MANUAL_SAVE = 1 << 8;
export const MODE_FLAG_AUTOMATIC_SAVE = 1 << 9;

export const COLOR_MODE_NONE = 0;
export const COLOR_MODE_PER_LED = 1;
export const COLOR_MODE_MODE_SPECIFIC = 2;
export const COLOR_MODE_RANDOM = 3;

export const DIRECTION_LABELS: Record<number, string> = {
    0: 'Esquerda',
    1: 'Direita',
    2: 'Cima',
    3: 'Baixo',
    4: 'Horizontal',
    5: 'Vertical',
};

export function hasModeFlag(flags: number, bit: number): boolean {
    return (flags & bit) !== 0;
}

export function modeHas(flagList: string[] | undefined, flags: number, name: string, bit: number): boolean {
    if (flagList && flagList.length) return flagList.includes(name);
    return hasModeFlag(flags, bit);
}
