import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import type { DeviceData, RGBColor, ZoneData } from '../types';
import { HardwareModeSelector } from './HardwareModeSelector';
import { LedPainter } from './LedPainter';
import { deviceLeds, deviceWash, kindLabel, ledHonesty, unusedHeaders, WASH_PRESETS, zoneKind } from '../lib/device';

interface LightingStudioProps {
    devices: DeviceData[];
    loading: boolean;
    scanning?: boolean;
    selectedDevice: string;
    onSelect: (id: string) => void;
    globalColor: string;
    brightness: number;
    onColor: (color: string) => void;
    onBrightness: (value: number) => void;
    onApply: () => void;
    onSaveProfile: () => void;
    onRescan?: () => Promise<void>;
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
    setZoneColor?: (deviceId: number, zoneId: number, color: string, brightness: number) => Promise<void>;
    setSingleLed?: (deviceId: number, ledId: number, color: string, brightness: number) => Promise<void>;
    resizeZone?: (deviceId: number, zoneId: number, length: number) => Promise<void>;
    setSegmentColor?: (deviceId: number, zoneId: number, segmentId: number, color: string, brightness: number) => Promise<void>;
    addSegment?: (deviceId: number, zoneId: number, name: string, start: number, length: number) => Promise<void>;
    clearSegments?: (deviceId: number, zoneId: number) => Promise<void>;
}

export const LightingStudio: React.FC<LightingStudioProps> = ({
    devices,
    loading,
    scanning = false,
    selectedDevice,
    onSelect,
    globalColor,
    brightness,
    onColor,
    onBrightness,
    onApply,
    onSaveProfile,
    onRescan,
    setMode,
    setModeWithParams,
    saveMode,
    setZoneColor,
    setSingleLed,
    resizeZone,
    setSegmentColor,
    addSegment,
    clearSegments,
}) => {
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [zoneColor, setZoneColor_] = useState(globalColor);
    const [applyingZone, setApplyingZone] = useState(false);
    const [segmentName, setSegmentName] = useState('');
    const [segmentStart, setSegmentStart] = useState(0);
    const [segmentLen, setSegmentLen] = useState(1);
    const [resizeDraft, setResizeDraft] = useState<number | null>(null);

    const selected = useMemo(
        () => (selectedDevice === 'all' ? null : devices.find((d) => String(d.id) === selectedDevice) || null),
        [devices, selectedDevice]
    );

    React.useEffect(() => {
        const zones = selected?.zones ?? [];
        setSelectedZoneId(zones.length === 1 ? zones[0].id : null);
        setSegmentName('');
        setSegmentStart(0);
        setSegmentLen(1);
        setResizeDraft(null);
    }, [selectedDevice, selected?.id]);

    const zones: ZoneData[] = selected?.zones ?? [];
    const activeZone = zones.find((z) => z.id === selectedZoneId) ?? null;

    const wash = selected ? deviceWash(selected, globalColor) : globalColor;
    const leds = selected
        ? deviceLeds(selected, wash, 96)
        : devices.flatMap((d) => deviceLeds(d, deviceWash(d, globalColor), 16)).slice(0, 96);
    const ring = 2 * Math.PI * 14;
    const ringOn = (brightness / 100) * ring;

    const handleApplyZone = async () => {
        if (!selected || selectedZoneId === null || !setZoneColor) return;
        try {
            setApplyingZone(true);
            await setZoneColor(selected.id, selectedZoneId, zoneColor, brightness);
        } finally {
            setApplyingZone(false);
        }
    };

    const handleResize = async (length: number) => {
        if (!selected || !activeZone || !resizeZone) return;
        if (length === activeZone.ledsCount) {
            setResizeDraft(null);
            return;
        }
        await resizeZone(selected.id, activeZone.id, length);
        setResizeDraft(null);
    };

    return (
        <div className="h-full grid grid-cols-[13.5rem_minmax(0,1fr)] min-h-0 p-2 bg-graphite-950">
            <aside className="overflow-y-auto p-2 space-y-1 flex flex-col">
                {onRescan && (
                    <button
                        type="button"
                        onClick={onRescan}
                        disabled={scanning}
                        className="w-full flex items-center gap-2 min-h-9 px-2.5 mb-1 rounded-lg text-xs text-ink-dim hover:text-ink border border-ink/10 disabled:opacity-50"
                        title="Re-enumerar dispositivos USB"
                    >
                        <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
                        {scanning ? 'Detectando…' : 'Redigitalizar'}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onSelect('all')}
                    className={`w-full flex items-center gap-2 min-h-11 px-2.5 rounded-xl text-left ${
                        selectedDevice === 'all' ? 'bg-graphite-600 text-ink' : 'text-ink-dim hover:bg-graphite-700 hover:text-ink'
                    }`}
                >
                    <span className="w-3.5 h-3.5 rounded-md border border-ink/20" style={{ background: globalColor }} />
                    <span className="text-[13px]">Tudo</span>
                </button>
                {loading && devices.length === 0 && <p className="px-2 py-2 text-xs text-ink-mute">A detectar…</p>}
                {devices.length === 0 && !loading && (
                    <p className="px-2 py-3 text-xs text-ink-mute text-center">
                        Nenhum device encontrado.
                        {onRescan && (
                            <> <button type="button" className="underline" onClick={onRescan}>Redigitalizar</button></>
                        )}
                    </p>
                )}
                {devices.map((d) => {
                    const on = selectedDevice === String(d.id);
                    const color = deviceWash(d, globalColor);
                    return (
                        <button
                            key={d.id}
                            type="button"
                            onClick={() => onSelect(String(d.id))}
                            className={`w-full flex items-center gap-2 min-h-11 px-2.5 rounded-xl text-left ${
                                on ? 'bg-graphite-600 text-ink' : 'text-ink-dim hover:bg-graphite-700 hover:text-ink'
                            }`}
                        >
                            <span
                                className="w-3.5 h-3.5 rounded-md border border-ink/20 shrink-0"
                                style={{
                                    background: color,
                                    boxShadow: on ? `0 0 10px ${color}` : undefined,
                                }}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] truncate">{d.name}</span>
                                <span className="nw-meta text-ink-mute block">
                                    {kindLabel(d)} · {ledHonesty(d)}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </aside>

            <section className="min-w-0 relative flex flex-col ml-2 rounded-xl overflow-hidden" style={{ background: wash }}>
                <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-graphite-950/20 to-transparent pointer-events-none" />
                {devices.length === 0 && (
                    <p className="absolute inset-0 flex items-center justify-center text-sm text-ink-dim">Nenhum device no palco</p>
                )}
                <div className="relative flex-1 min-h-0 p-4">
                    <p className="nw-chip w-fit">
                        {selectedDevice === 'all'
                            ? `${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`
                            : selected?.name || 'Device'}
                    </p>
                    {selected && (
                        <div className="mt-2 flex flex-wrap gap-1.5 max-w-[28rem]">
                            <span className="nw-chip">{kindLabel(selected)}</span>
                            {selected.vendor && <span className="nw-chip">{selected.vendor}</span>}
                            <span className="nw-chip">{ledHonesty(selected)}</span>
                            {selected.version && <span className="nw-chip">fw {selected.version}</span>}
                            {selected.location && (
                                <span className="nw-chip truncate max-w-[12rem]" title={selected.location}>
                                    {selected.location}
                                </span>
                            )}
                            {selected.serial && (
                                <span className="nw-chip truncate max-w-[10rem]" title={selected.serial}>
                                    {selected.serial}
                                </span>
                            )}
                            {(selected.flagList || []).map((flag) => (
                                <span key={flag} className="nw-chip">{flag}</span>
                            ))}
                        </div>
                    )}
                    <div className="absolute left-4 right-4 bottom-3 flex gap-px rounded-full overflow-hidden h-2">
                        {leds.map((c, i) => (
                            <span key={i} className="flex-1 min-w-[2px]" style={{ background: c }} />
                        ))}
                    </div>
                </div>

                <div className="relative m-3 mt-0 nw-dock p-3 space-y-3 max-h-[58%] overflow-y-auto">
                    <div className="flex flex-wrap items-center gap-3">
                        <input
                            type="color"
                            value={globalColor}
                            onChange={(e) => onColor(e.target.value)}
                            className="w-10 h-10"
                            aria-label="Escolher cor"
                        />
                        <div className="flex gap-1.5">
                            {WASH_PRESETS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    aria-label={c}
                                    onClick={() => onColor(c)}
                                    className={`w-7 h-7 rounded-lg border ${globalColor === c ? 'border-ink' : 'border-transparent'}`}
                                    style={{ background: c }}
                                />
                            ))}
                        </div>
                        <label className="flex items-center gap-2 ml-auto">
                            <span className="relative w-11 h-11 shrink-0 text-ink-mute" aria-hidden>
                                <svg viewBox="0 0 36 36" className="w-11 h-11 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-graphite-600" />
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="14"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        className="text-ember"
                                        strokeDasharray={`${ringOn} ${ring}`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <span className="nw-meta tabular-nums text-ink absolute inset-0 flex items-center justify-center">
                                    {brightness}
                                </span>
                            </span>
                            <span className="sr-only">Brilho</span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={brightness}
                                onChange={(e) => onBrightness(parseInt(e.target.value, 10))}
                                className="w-28"
                                aria-label="Brilho"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={onSaveProfile}
                            className="min-h-9 px-3 nw-body font-medium border border-ink/15 text-ink-dim rounded-lg"
                        >
                            Salvar
                        </button>
                        <button
                            type="button"
                            onClick={onApply}
                            className="min-h-9 px-4 nw-body font-semibold bg-ink text-graphite-950 rounded-lg"
                        >
                            Aplicar
                        </button>
                    </div>
                    <HardwareModeSelector
                        selected={selected}
                        setMode={setMode}
                        setModeWithParams={setModeWithParams}
                        saveMode={saveMode}
                    />

                    {selected && setSingleLed && (
                        <LedPainter
                            device={selected}
                            zone={activeZone}
                            paintColor={globalColor}
                            brightness={brightness}
                            onPaint={(ledId, color, bright) => setSingleLed(selected.id, ledId, color, bright)}
                        />
                    )}

                    {selected && zones.length >= 1 && setZoneColor && (
                        <div>
                            <p className="nw-kicker text-ink-mute mb-2">
                                Zonas · {selected.name}
                            </p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {zones.map((zone) => {
                                    const on = selectedZoneId === zone.id;
                                    return (
                                        <button
                                            key={zone.id}
                                            type="button"
                                            onClick={() => setSelectedZoneId(on && zones.length > 1 ? null : zone.id)}
                                            className={`min-h-8 px-2.5 text-xs rounded-md border ${
                                                on
                                                    ? 'border-ink/25 text-ink bg-graphite-600'
                                                    : 'border-ink/10 text-ink-dim hover:text-ink'
                                            }`}
                                            title={`${zone.ledsCount} LED${zone.ledsCount === 1 ? '' : 's'}${zone.resizable && zone.ledsCount === 0 ? ' · cabeçalho vazio' : ''}`}
                                        >
                                            {zone.name || `Zona ${zone.id}`}
                                            <span className="ml-1 text-ink-mute text-[10px]">
                                                {zone.ledsCount === 0 && zone.resizable
                                                    ? '0 · header'
                                                    : `${zone.ledsCount} · ${zoneKind(zone)}`}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {unusedHeaders(selected).length > 0 && (
                                <p className="nw-meta text-ink-mute mb-2">
                                    {unusedHeaders(selected).length} cabeçalho{unusedHeaders(selected).length === 1 ? '' : 's'} ARGB com 0 LED — redimensione para pintar.
                                </p>
                            )}
                            {activeZone && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={zoneColor}
                                            onChange={(e) => setZoneColor_(e.target.value)}
                                            className="w-8 h-8"
                                            aria-label="Cor da zona"
                                        />
                                        <span className="nw-meta text-ink-mute flex-1">
                                            {activeZone.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleApplyZone}
                                            disabled={applyingZone}
                                            className="min-h-8 px-3 nw-body font-semibold bg-ink text-graphite-950 rounded-lg disabled:opacity-50"
                                        >
                                            {applyingZone ? '…' : 'Aplicar zona'}
                                        </button>
                                    </div>
                                    {activeZone.resizable && resizeZone && (
                                        <label className="flex items-center gap-2">
                                            <span className="nw-meta text-ink-mute">Tamanho</span>
                                            <input
                                                type="range"
                                                min={activeZone.ledsMin}
                                                max={activeZone.ledsMax}
                                                value={resizeDraft ?? activeZone.ledsCount}
                                                onChange={(e) => setResizeDraft(parseInt(e.target.value, 10))}
                                                onPointerUp={(e) => {
                                                    void handleResize(parseInt((e.currentTarget as HTMLInputElement).value, 10));
                                                }}
                                                onKeyUp={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        void handleResize(parseInt((e.currentTarget as HTMLInputElement).value, 10));
                                                    }
                                                }}
                                                className="flex-1"
                                                aria-label="Redimensionar zona"
                                            />
                                            <span className="nw-meta tabular-nums text-ink-dim">
                                                {resizeDraft ?? activeZone.ledsCount}/{activeZone.ledsMax}
                                            </span>
                                        </label>
                                    )}
                                    {(activeZone.segments?.length > 0 || addSegment) && (
                                        <div>
                                            <p className="nw-kicker text-ink-mute mb-1">Segmentos</p>
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {(activeZone.segments || []).map((seg) => (
                                                    <button
                                                        key={seg.id}
                                                        type="button"
                                                        disabled={!setSegmentColor}
                                                        onClick={() => {
                                                            if (!setSegmentColor) return;
                                                            void setSegmentColor(selected.id, activeZone.id, seg.id, zoneColor, brightness);
                                                        }}
                                                        className="min-h-8 px-2.5 text-xs rounded-md border border-ink/10 text-ink-dim hover:text-ink"
                                                        title={`${seg.ledsCount} LEDs`}
                                                    >
                                                        {seg.name}
                                                    </button>
                                                ))}
                                                {clearSegments && (activeZone.segments?.length ?? 0) > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void clearSegments(selected.id, activeZone.id)}
                                                        className="min-h-8 px-2.5 text-xs rounded-md border border-ink/10 text-ink-mute hover:text-ink"
                                                    >
                                                        Limpar
                                                    </button>
                                                )}
                                            </div>
                                            {addSegment && (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <input
                                                        type="text"
                                                        value={segmentName}
                                                        onChange={(e) => setSegmentName(e.target.value)}
                                                        placeholder="Nome"
                                                        aria-label="Nome do segmento"
                                                        className="min-h-8 w-24 bg-graphite-950 border border-ink/10 px-2 nw-body rounded-md"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={Math.max(0, activeZone.ledsCount - 1)}
                                                        value={segmentStart}
                                                        onChange={(e) => setSegmentStart(parseInt(e.target.value, 10) || 0)}
                                                        aria-label="Início do segmento"
                                                        className="min-h-8 w-14 bg-graphite-950 border border-ink/10 px-2 nw-body rounded-md"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={activeZone.ledsCount}
                                                        value={segmentLen}
                                                        onChange={(e) => setSegmentLen(parseInt(e.target.value, 10) || 1)}
                                                        aria-label="Comprimento do segmento"
                                                        className="min-h-8 w-14 bg-graphite-950 border border-ink/10 px-2 nw-body rounded-md"
                                                    />
                                                    <button
                                                        type="button"
                                                        disabled={!segmentName.trim()}
                                                        onClick={() => {
                                                            void addSegment(selected.id, activeZone.id, segmentName.trim(), segmentStart, segmentLen);
                                                            setSegmentName('');
                                                        }}
                                                        className="min-h-8 px-2.5 text-xs rounded-md border border-ink/15 text-ink-dim disabled:opacity-40"
                                                    >
                                                        Novo
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};
