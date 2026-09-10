import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { ledMatrixGridFromZones, ledSampleMarkers } from '../lib/ledCanvasPoint';
import type { CanvasLayout, DeviceData } from '../types';

interface CanvasLayoutMapProps {
    active?: boolean;
}

export const CanvasLayoutMap: React.FC<CanvasLayoutMapProps> = ({ active }) => {
    const [layout, setLayout] = useState<CanvasLayout | null>(null);
    const [liveDevices, setLiveDevices] = useState<DeviceData[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const [layoutRes, devicesRes] = await Promise.all([
                api.getLayout(),
                api.getDevices().catch(() => ({ data: [] as DeviceData[] })),
            ]);
            setLayout(layoutRes.data);
            setLiveDevices(Array.isArray(devicesRes.data) ? devicesRes.data : []);
            setError(null);
            if (!selectedId && layoutRes.data?.devices?.length) {
                setSelectedId(String(layoutRes.data.devices[0].id));
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Falha ao carregar layout');
        }
    }, [selectedId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const zonesFor = (deviceId: string | number) => {
        const d = liveDevices.find((x) => String(x.id) === String(deviceId));
        return d?.zones;
    };

    const runAuto = async () => {
        setBusy(true);
        try {
            const res = await api.autoLayout();
            setLayout(res.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setBusy(false);
        }
    };

    const nudge = async (dx: number, dy: number) => {
        if (!selectedId) return;
        setBusy(true);
        try {
            const res = await api.nudgeLayoutDevice(selectedId, dx, dy);
            setLayout(res.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setBusy(false);
        }
    };

    const cw = layout?.canvasWidth || 1000;
    const ch = layout?.canvasHeight || 600;
    const devices = layout?.devices || [];

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <p className="nw-kicker text-ink-mute">Canvas · layout</p>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => { void runAuto(); }}
                    className="min-h-8 px-2.5 text-xs rounded-md border border-ink/15 text-ink-dim hover:text-ink disabled:opacity-40"
                >
                    Auto
                </button>
            </div>
            <div
                className={`relative w-full overflow-hidden rounded-xl border border-ink/10 bg-graphite-950 ${
                    active ? 'ring-1 ring-ember/40' : ''
                }`}
                style={{ aspectRatio: `${cw} / ${Math.max(ch * 0.55, 280)}` }}
                data-testid="canvas-layout-map"
                data-effect-live={active ? 'true' : 'false'}
            >
                {/* Continuous 2D effect field under device boxes (matches diagonal X+Y sampling) */}
                <div
                    className={`nw-canvas-effect-field absolute inset-0 ${
                        active ? 'nw-canvas-effect-field--live' : ''
                    }`}
                    aria-hidden
                />
                {/* Grid hint over the field */}
                <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, rgba(120,180,100,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,180,100,0.35) 1px, transparent 1px)',
                        backgroundSize: '8% 12%',
                    }}
                />
                {devices.map((d) => {
                    const selected = String(d.id) === selectedId;
                    const zones = zonesFor(d.id);
                    const matrixGrid = ledMatrixGridFromZones(zones);
                    const markers = matrixGrid ? null : ledSampleMarkers(d, d.ledCount, undefined, zones);
                    return (
                        <button
                            key={d.id}
                            type="button"
                            title={d.name}
                            onClick={() => setSelectedId(String(d.id))}
                            data-canvas-device-cell
                            data-selected={selected ? 'true' : 'false'}
                            className={`nw-canvas-device-cell absolute z-10 text-left px-1 overflow-hidden bg-transparent ${
                                selected
                                    ? 'border border-ember ring-1 ring-ember/50 text-ink'
                                    : 'border border-white/35 text-ink'
                            }`}
                            style={{
                                left: `${(d.x / cw) * 100}%`,
                                top: `${(d.y / ch) * 100}%`,
                                width: `${(d.width / cw) * 100}%`,
                                height: `${(d.height / ch) * 100}%`,
                                minWidth: 28,
                                minHeight: 18,
                            }}
                        >
                            {/* Matrix: cell-tiled silhouette with structural null voids (F-row / numpad wells) */}
                            {matrixGrid ? (
                                <span
                                    className="nw-canvas-led-matrix absolute inset-0 pointer-events-none"
                                    data-led-matrix-grid
                                    aria-hidden
                                    style={{
                                        gridTemplateColumns: `repeat(${matrixGrid.width}, 1fr)`,
                                        gridTemplateRows: `repeat(${matrixGrid.height}, 1fr)`,
                                    }}
                                >
                                    {matrixGrid.cells.map((cell) =>
                                        cell.isVoid ? (
                                            <span
                                                key={`${d.id}-void-${cell.row}-${cell.col}`}
                                                data-led-matrix-cell
                                                data-led-matrix-void
                                                className="nw-canvas-led-matrix-void"
                                            />
                                        ) : (
                                            <span
                                                key={`${d.id}-lit-${cell.row}-${cell.col}`}
                                                data-led-matrix-cell
                                                data-led-sample
                                                data-led-index={cell.ledIndex ?? undefined}
                                                className={`nw-canvas-led-matrix-lit ${
                                                    active ? 'nw-canvas-led-matrix-lit--live' : ''
                                                }`}
                                            />
                                        ),
                                    )}
                                </span>
                            ) : (
                                /* Lattice fallback: density-capped stars when no OpenRGB matrix */
                                <span className="nw-canvas-led-layer absolute inset-0 pointer-events-none" aria-hidden>
                                    {(markers || []).map((m) => (
                                        <span
                                            key={`${d.id}-${m.index}`}
                                            data-led-sample
                                            data-led-index={m.index}
                                            className={`nw-canvas-led-sample ${
                                                active ? 'nw-canvas-led-sample--live' : ''
                                            }`}
                                            style={{
                                                left: `${m.leftPct}%`,
                                                top: `${m.topPct}%`,
                                            }}
                                        />
                                    ))}
                                </span>
                            )}
                            <span className="nw-canvas-device-label relative z-[1] block text-[9px] leading-tight truncate">{d.name}</span>
                            <span className="nw-canvas-device-label relative z-[1] block text-[8px] text-ink/80 tabular-nums">{d.ledCount} LED</span>
                        </button>
                    );
                })}
                {!devices.length && (
                    <p className="absolute inset-0 flex items-center justify-center nw-meta text-ink-mute px-4 text-center">
                        Sem devices — conecte o OpenRGB e toque Auto
                    </p>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                <span className="nw-meta text-ink-mute truncate flex-1">
                    {selectedId
                        ? devices.find((d) => String(d.id) === selectedId)?.name || selectedId
                        : 'Selecione um device'}
                </span>
                <button type="button" disabled={busy || !selectedId} onClick={() => { void nudge(-40, 0); }} className="min-h-8 min-w-8 text-xs rounded-md border border-ink/15 disabled:opacity-40" aria-label="Mover esquerda">←</button>
                <button type="button" disabled={busy || !selectedId} onClick={() => { void nudge(0, -40); }} className="min-h-8 min-w-8 text-xs rounded-md border border-ink/15 disabled:opacity-40" aria-label="Mover cima">↑</button>
                <button type="button" disabled={busy || !selectedId} onClick={() => { void nudge(0, 40); }} className="min-h-8 min-w-8 text-xs rounded-md border border-ink/15 disabled:opacity-40" aria-label="Mover baixo">↓</button>
                <button type="button" disabled={busy || !selectedId} onClick={() => { void nudge(40, 0); }} className="min-h-8 min-w-8 text-xs rounded-md border border-ink/15 disabled:opacity-40" aria-label="Mover direita">→</button>
            </div>
            {error && <p className="nw-meta text-ember">{error}</p>}
            <p className="nw-meta text-ink-mute">
                Onda no canvas · cada retângulo amostra a cor pelo X/Y
            </p>
        </div>
    );
};
