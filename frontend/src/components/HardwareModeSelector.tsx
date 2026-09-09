import React, { useEffect, useMemo, useState } from 'react';
import type { DeviceData, ModeData, RGBColor } from '../types';
import {
    COLOR_MODE_RANDOM,
    DIRECTION_LABELS,
    MODE_FLAG_HAS_BRIGHTNESS,
    MODE_FLAG_HAS_DIRECTION_HV,
    MODE_FLAG_HAS_DIRECTION_LR,
    MODE_FLAG_HAS_DIRECTION_UD,
    MODE_FLAG_HAS_MODE_SPECIFIC_COLOR,
    MODE_FLAG_HAS_RANDOM_COLOR,
    MODE_FLAG_HAS_SPEED,
    MODE_FLAG_MANUAL_SAVE,
    MODE_FLAG_AUTOMATIC_SAVE,
    modeHas,
} from '../lib/openrgb-mode';
import { hexToRgb, rgbToHex } from '../lib/device';

interface HardwareModeSelectorProps {
    selected: DeviceData | null;
    setMode: (deviceId: number, modeId: number) => Promise<void>;
    setModeWithParams?: (
        deviceId: number,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: RGBColor[]; colorMode?: number },
    ) => Promise<void>;
    saveMode?: (
        deviceId: number,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: RGBColor[]; colorMode?: number },
    ) => Promise<void>;
}

function directionsFor(mode: ModeData): number[] {
    const ids: number[] = [];
    if (modeHas(mode.flagList, mode.flags, 'directionLR', MODE_FLAG_HAS_DIRECTION_LR)) ids.push(0, 1);
    if (modeHas(mode.flagList, mode.flags, 'directionUD', MODE_FLAG_HAS_DIRECTION_UD)) ids.push(2, 3);
    if (modeHas(mode.flagList, mode.flags, 'directionHV', MODE_FLAG_HAS_DIRECTION_HV)) ids.push(4, 5);
    return ids;
}

export const HardwareModeSelector: React.FC<HardwareModeSelectorProps> = ({
    selected,
    setMode,
    setModeWithParams,
    saveMode,
}) => {
    const target = selected;
    const active = useMemo(
        () => target?.modes?.find((m) => m.id === target.activeMode) ?? target?.modes?.[0],
        [target],
    );
    const [speed, setSpeed] = useState(0);
    const [modeBrightness, setModeBrightness] = useState(0);
    const [direction, setDirection] = useState(0);
    const [modeColors, setModeColors] = useState<RGBColor[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!active) return;
        setSpeed(active.speed ?? 0);
        setModeBrightness(active.brightness ?? 0);
        setDirection(active.direction ?? 0);
        setModeColors(active.colors ?? []);
    }, [active?.id, active?.speed, active?.brightness, active?.direction, target?.id]);

    if (!selected || !target?.modes?.length) return null;

    const hasSpeed = active ? modeHas(active.flagList, active.flags, 'speed', MODE_FLAG_HAS_SPEED) : false;
    const hasBright = active ? modeHas(active.flagList, active.flags, 'brightness', MODE_FLAG_HAS_BRIGHTNESS) : false;
    const dirs = active ? directionsFor(active) : [];
    const hasModeColors = active
        ? modeHas(active.flagList, active.flags, 'modeSpecificColor', MODE_FLAG_HAS_MODE_SPECIFIC_COLOR)
        : false;
    const hasRandom = active ? modeHas(active.flagList, active.flags, 'randomColor', MODE_FLAG_HAS_RANDOM_COLOR) : false;
    const canSave = active ? modeHas(active.flagList, active.flags, 'manualSave', MODE_FLAG_MANUAL_SAVE) : false;
    const autoSave = active ? modeHas(active.flagList, active.flags, 'automaticSave', MODE_FLAG_AUTOMATIC_SAVE) : false;
    const showParams = Boolean(setModeWithParams && active && (hasSpeed || hasBright || dirs.length || hasModeColors || hasRandom || canSave || autoSave));

    const applyParams = async (
        extra: { colorMode?: number; colors?: RGBColor[]; direction?: number } = {},
        save = false,
    ) => {
        if (!target || !active || !setModeWithParams) return;
        setBusy(true);
        try {
            const params = {
                speed: hasSpeed ? speed : undefined,
                brightness: hasBright ? modeBrightness : undefined,
                direction: extra.direction ?? (dirs.length ? direction : undefined),
                colors: extra.colors ?? (hasModeColors ? modeColors : undefined),
                colorMode: extra.colorMode,
            };
            if (save && saveMode) await saveMode(target.id, active.id, params);
            else await setModeWithParams(target.id, active.id, params);
        } finally {
            setBusy(false);
        }
    };

    const colorSlots = Math.max(active?.colors_min ?? 0, Math.min(active?.colors_max ?? modeColors.length, 8));

    return (
        <div>
            <p className="nw-kicker text-ink-mute mb-2">
                Modo hardware · {target.name}
            </p>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {target.modes.map((mode) => {
                    const on = target.activeMode === mode.id;
                    return (
                        <button
                            key={mode.id}
                            type="button"
                            onClick={() => setMode(target.id, mode.id)}
                            className={`min-h-8 px-2.5 text-left text-xs rounded-md border ${
                                on ? 'border-ink/25 text-ink bg-graphite-600' : 'border-ink/10 text-ink-dim hover:text-ink'
                            }`}
                        >
                            {mode.name}
                        </button>
                    );
                })}
            </div>

            {showParams && active && (
                <div className="mt-2 space-y-2">
                    {hasSpeed && (
                        <label className="flex items-center gap-2">
                            <span className="nw-meta text-ink-mute w-16">Vel</span>
                            <input
                                type="range"
                                min={active.speed_min ?? 0}
                                max={active.speed_max ?? 100}
                                value={speed}
                                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                                onPointerUp={() => { void applyParams(); }}
                                className="flex-1"
                                aria-label="Velocidade do modo"
                            />
                            <span className="nw-meta tabular-nums text-ink-dim w-8 text-right">{speed}</span>
                        </label>
                    )}
                    {hasBright && (
                        <label className="flex items-center gap-2">
                            <span className="nw-meta text-ink-mute w-16">Brilho</span>
                            <input
                                type="range"
                                min={active.brightness_min ?? 0}
                                max={active.brightness_max ?? 100}
                                value={modeBrightness}
                                onChange={(e) => setModeBrightness(parseInt(e.target.value, 10))}
                                onPointerUp={() => { void applyParams(); }}
                                className="flex-1"
                                aria-label="Brilho do modo"
                            />
                            <span className="nw-meta tabular-nums text-ink-dim w-8 text-right">{modeBrightness}</span>
                        </label>
                    )}
                    {dirs.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {dirs.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => {
                                        setDirection(d);
                                        void applyParams({ direction: d });
                                    }}
                                    className={`min-h-8 px-2.5 text-xs rounded-md border ${
                                        direction === d
                                            ? 'border-ink/25 text-ink bg-graphite-600'
                                            : 'border-ink/10 text-ink-dim hover:text-ink'
                                    }`}
                                >
                                    {DIRECTION_LABELS[d] ?? d}
                                </button>
                            ))}
                        </div>
                    )}
                    {hasModeColors && colorSlots > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                            {Array.from({ length: colorSlots }, (_, i) => {
                                const current = modeColors[i] ?? { red: 255, green: 77, blue: 141 };
                                return (
                                    <input
                                        key={i}
                                        type="color"
                                        value={rgbToHex(current)}
                                        aria-label={`Cor do modo ${i + 1}`}
                                        className="w-7 h-7"
                                        onChange={(e) => {
                                            const next = [...modeColors];
                                            next[i] = hexToRgb(e.target.value);
                                            setModeColors(next);
                                            void applyParams({ colors: next });
                                        }}
                                    />
                                );
                            })}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                        {hasRandom && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void applyParams({ colorMode: COLOR_MODE_RANDOM })}
                                className={`min-h-8 px-2.5 text-xs rounded-md border ${
                                    active.colorMode === COLOR_MODE_RANDOM
                                        ? 'border-ink/25 text-ink bg-graphite-600'
                                        : 'border-ink/10 text-ink-dim hover:text-ink'
                                }`}
                            >
                                Cor aleatória
                            </button>
                        )}
                        {canSave && saveMode && (
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => void applyParams({}, true)}
                                className="min-h-8 px-2.5 text-xs rounded-md border border-ink/15 text-ink-dim hover:text-ink"
                            >
                                Gravar no device
                            </button>
                        )}
                        {autoSave && (
                            <span className="nw-meta text-ink-mute self-center">grava sozinho</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
