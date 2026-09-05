import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { DeviceData, Profile } from '../types';
import { activeModeName, deviceLeds, deviceWash, kindLabel } from '../lib/device';
import { ChassisGhost, slotForDevice } from './ChassisGhost';

const PRESETS = ['#c9897a', '#d45c5c', '#c4a35a', '#6f9e6a', '#4a7ea8', '#f3ead8'];
const BRIGHT_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

interface DashboardProps {
    connected: boolean;
    loading?: boolean;
    devices: DeviceData[];
    profiles: Profile[];
    globalColor: string;
    brightness: number;
    onOpenDevice: (id: string) => void;
    onApplyProfile: (id: string) => void;
    onColor: (color: string) => void;
    onBrightness: (value: number) => void;
    onSaveScene: () => void;
    onPaintAll: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
    connected,
    loading,
    devices,
    profiles,
    globalColor,
    brightness,
    onOpenDevice,
    onApplyProfile,
    onColor,
    onBrightness,
    onSaveScene,
    onPaintAll,
}) => {
    const leadMode = devices[0] ? activeModeName(devices[0]) : null;
    const ring = 2 * Math.PI * 28;
    const ringOn = (brightness / 100) * ring;
    const hotspots = useMemo(() => {
        const used = new Set<string>();
        return devices.map((device) => ({ device, slot: slotForDevice(device, used) }));
    }, [devices]);

    return (
        <div className="h-full min-h-0 grid grid-cols-[minmax(0,1fr)_18.5rem] bg-graphite-950">
            <div className="min-w-0 min-h-0 flex flex-col p-3 pr-2 gap-3">
                {loading && devices.length === 0 && (
                    <p className="text-sm text-ink-dim">A detectar hardware…</p>
                )}
                {!loading && devices.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 nw-stage">
                        <p className="nw-display text-[22px]">Nada ligado ainda</p>
                        <p className="mt-2 text-sm text-ink-dim max-w-sm">
                            {connected
                                ? 'O SDK está no ar, mas nenhum device RGB respondeu.'
                                : 'Liga o lighting do PC. O palco e a lista aparecem aqui.'}
                        </p>
                    </div>
                )}
                {devices.length > 0 && (
                    <>
                        <section className="relative flex-1 min-h-0 overflow-hidden nw-stage">
                            <div className="absolute inset-0 flex">
                                {devices.map((device) => (
                                    <span
                                        key={device.id}
                                        className="flex-1 min-w-0"
                                        style={{ background: deviceWash(device, globalColor) }}
                                    />
                                ))}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-graphite-950/55 to-graphite-950/20" />
                            <div className="relative h-full flex flex-col">
                                <header className="flex items-start justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                        <p className="nw-display text-[28px] text-ink">O PC agora</p>
                                        <p className="nw-body mt-1 text-ink-dim">Palco ao vivo · clique no chassis ou num device</p>
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                        <span className="nw-chip">{connected ? 'SDK' : 'SDK offline'}</span>
                                        <span className="nw-chip">
                                            {devices.length} {devices.length === 1 ? 'device' : 'devices'}
                                        </span>
                                        <span className="nw-chip">{brightness}%</span>
                                        <span className="nw-chip">{leadMode || 'sync'}</span>
                                    </div>
                                </header>
                                <div className="relative flex-1 min-h-0 mx-4 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => onOpenDevice('all')}
                                        className="absolute inset-0 text-ink-mute"
                                        aria-label="Pintar tudo"
                                    >
                                        <ChassisGhost color={globalColor} className="h-full w-full max-h-[22rem] mx-auto" />
                                    </button>
                                    {hotspots.map(({ device, slot }) => {
                                        const color = deviceWash(device, globalColor);
                                        return (
                                            <button
                                                key={device.id}
                                                type="button"
                                                onClick={() => onOpenDevice(String(device.id))}
                                                className="absolute z-10 nw-float flex items-center gap-2 px-2.5 py-1.5 max-w-[11rem]"
                                                style={{ left: slot.x, top: slot.y }}
                                            >
                                                <span
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                                                />
                                                <span className="min-w-0 text-left">
                                                    <span className="block nw-kicker text-ink truncate">{kindLabel(device)}</span>
                                                    <span className="nw-meta text-ink-mute truncate block">
                                                        {device.name}
                                                    </span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="relative mx-3 mb-3 nw-float p-2 space-y-1 max-h-[9.5rem] overflow-y-auto">
                                    <h2 className="nw-kicker px-2 mb-1 text-ink-mute">
                                        Devices
                                    </h2>
                                    {devices.map((device) => {
                                        const color = deviceWash(device, globalColor);
                                        const tape = deviceLeds(device, color, 12);
                                        const leds = device.ledCount || device.leds?.length || 0;
                                        const mode = activeModeName(device);
                                        return (
                                            <button
                                                key={device.id}
                                                type="button"
                                                onClick={() => onOpenDevice(String(device.id))}
                                                className="w-full min-h-11 flex items-center gap-3 px-2.5 py-1.5 rounded-xl text-left hover:bg-graphite-700"
                                            >
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="nw-body block text-ink truncate">{device.name}</span>
                                                    <span className="nw-meta block text-ink-mute">
                                                        {kindLabel(device)} · {leds} LED
                                                        {mode ? ` · ${mode}` : ''}
                                                    </span>
                                                </span>
                                                <span className="hidden sm:flex h-1.5 w-16 gap-px overflow-hidden rounded-full">
                                                    {tape.map((c, i) => (
                                                        <span key={i} className="flex-1" style={{ background: c }} />
                                                    ))}
                                                </span>
                                                <ChevronRight size={14} className="text-ink-mute shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>

            <aside className="min-h-0 overflow-y-auto p-3 pl-1 space-y-3">
                <section className="nw-dock p-4 space-y-4">
                    <h2 className="nw-kicker text-ink-mute">Pintar</h2>
                    <button
                        type="button"
                        onClick={onPaintAll}
                        className="w-full min-h-11 flex items-center gap-2 px-3 rounded-lg bg-ink text-graphite-950 font-semibold text-sm"
                    >
                        <span className="w-4 h-4 border border-graphite-950/20" style={{ background: globalColor }} />
                        Pintar tudo
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <input
                            type="color"
                            value={globalColor}
                            onChange={(e) => onColor(e.target.value)}
                            className="w-8 h-8"
                            aria-label="Escolher cor"
                        />
                        {PRESETS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={`Pintar ${c}`}
                                onClick={() => onColor(c)}
                                className={`w-8 h-8 rounded-xl border ${globalColor === c ? 'border-ink' : 'border-transparent'}`}
                                style={{ background: c }}
                            />
                        ))}
                    </div>
                    <div className="flex flex-col items-center gap-3 pt-1">
                        <label className="relative w-[7.25rem] h-[7.25rem] cursor-pointer">
                            <span className="sr-only">Brilho {brightness}%</span>
                            <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90 text-ink-mute">
                                <circle cx="36" cy="36" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-graphite-600" />
                                <circle
                                    cx="36"
                                    cy="36"
                                    r="28"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="6"
                                    className="text-ember"
                                    strokeDasharray={`${ringOn} ${ring}`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="nw-num text-[22px] text-ink">{brightness}</span>
                                <span className="nw-meta text-ink-mute">Brilho</span>
                            </span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={brightness}
                                onChange={(e) => onBrightness(parseInt(e.target.value, 10))}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                aria-label="Brilho"
                            />
                        </label>
                        <span className="flex w-full gap-1" aria-hidden>
                            {BRIGHT_STEPS.map((step) => (
                                <button
                                    key={step}
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => onBrightness(step)}
                                    className={`h-2 flex-1 rounded-full ${brightness >= step ? 'bg-ember' : 'bg-graphite-600'}`}
                                />
                            ))}
                        </span>
                    </div>
                </section>

                <section className="nw-dock p-3 space-y-2">
                    <h2 className="nw-kicker text-ink-mute">Cenas</h2>
                    {profiles.length === 0 && (
                        <p className="text-[12px] text-ink-dim">Nenhuma cena ainda.</p>
                    )}
                    {profiles.map((profile) => (
                        <button
                            key={profile.id}
                            type="button"
                            onClick={() => onApplyProfile(profile.id)}
                            className="w-full text-left px-2.5 py-2 rounded-xl border border-ink/10 hover:border-ember/50"
                        >
                            <span className="flex h-1.5 gap-px mb-1.5 overflow-hidden rounded-full">
                                {(profile.devices || []).slice(0, 8).map((d, i) => (
                                    <span
                                        key={i}
                                        className="flex-1"
                                        style={{
                                            background: d.color
                                                ? `rgb(${d.color.red},${d.color.green},${d.color.blue})`
                                                : '#2a2622',
                                        }}
                                    />
                                ))}
                            </span>
                            <span className="nw-body block text-ink truncate">{profile.name}</span>
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onSaveScene}
                        className="w-full min-h-9 nw-body font-medium text-ink-mute border border-dashed border-ink/15 hover:text-ember hover:border-ember/40 rounded-xl"
                    >
                        Salvar cena
                    </button>
                </section>
            </aside>
        </div>
    );
};
