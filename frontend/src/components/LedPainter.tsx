import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { DeviceData, ZoneData } from '../types';
import { rgbCss } from '../lib/device';

interface LedPainterProps {
    device: DeviceData;
    zone: ZoneData | null;
    paintColor: string;
    brightness: number;
    onPaint: (ledId: number, color: string, brightness: number) => Promise<void>;
}

export const LedPainter: React.FC<LedPainterProps> = ({
    device,
    zone,
    paintColor,
    brightness,
    onPaint,
}) => {
    const painting = useRef(false);
    const [overlay, setOverlay] = useState<Record<number, string>>({});

    const leds = useMemo(() => {
        const start = zone ? zone.ledsStart : 0;
        const count = zone ? zone.ledsCount : device.ledCount || device.colors?.length || 0;
        return Array.from({ length: count }, (_, i) => {
            const id = start + i;
            return {
                id,
                name: device.leds?.[id]?.name || `LED ${id}`,
                color: overlay[id] || rgbCss(device.colors?.[id], paintColor),
            };
        });
    }, [device, zone, paintColor, overlay]);

    const paint = useCallback(async (ledId: number) => {
        setOverlay((prev) => ({ ...prev, [ledId]: paintColor }));
        await onPaint(ledId, paintColor, brightness);
    }, [onPaint, paintColor, brightness]);

    const matrix = zone?.matrix;

    if (!leds.length) return null;

    if (matrix && matrix.height > 0 && matrix.width > 0) {
        return (
            <div>
                <p className="nw-kicker text-ink-mute mb-2">LEDs · layout</p>
                <div
                    className="grid gap-px p-1 rounded-lg bg-graphite-950/60 overflow-auto max-h-40"
                    style={{ gridTemplateColumns: `repeat(${matrix.width}, minmax(10px, 1fr))` }}
                    onMouseLeave={() => { painting.current = false; }}
                    onMouseUp={() => { painting.current = false; }}
                >
                    {matrix.map.flatMap((row, y) =>
                        (row || []).map((cell, x) => {
                            if (cell === null) {
                                return <span key={`${y}-${x}`} className="aspect-square min-h-[10px]" />;
                            }
                            const ledId = (zone?.ledsStart ?? 0) + cell;
                            const color = overlay[ledId] || rgbCss(device.colors?.[ledId], paintColor);
                            return (
                                <button
                                    key={`${y}-${x}`}
                                    type="button"
                                    title={device.leds?.[ledId]?.name || `LED ${ledId}`}
                                    className="aspect-square min-h-[10px] rounded-[2px] border border-ink/10"
                                    style={{ background: color }}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        painting.current = true;
                                        void paint(ledId);
                                    }}
                                    onMouseEnter={() => {
                                        if (painting.current) void paint(ledId);
                                    }}
                                />
                            );
                        }),
                    )}
                </div>
            </div>
        );
    }

    return (
        <div>
            <p className="nw-kicker text-ink-mute mb-2">
                LEDs{zone ? ` · ${zone.name}` : ''} · clique para pintar
            </p>
            <div
                className="flex flex-wrap gap-px max-h-24 overflow-y-auto"
                onMouseLeave={() => { painting.current = false; }}
                onMouseUp={() => { painting.current = false; }}
            >
                {leds.map((led) => (
                    <button
                        key={led.id}
                        type="button"
                        title={led.name}
                        className="w-3 h-3 rounded-[2px] border border-ink/10"
                        style={{ background: led.color }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            painting.current = true;
                            void paint(led.id);
                        }}
                        onMouseEnter={() => {
                            if (painting.current) void paint(led.id);
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
