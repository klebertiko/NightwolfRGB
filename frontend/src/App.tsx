import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useOpenRGB } from './hooks/useOpenRGB';
import { useDevices } from './hooks/useDevices';
import { useProfiles } from './hooks/useProfiles';
import { useEffects } from './hooks/useEffects';
import { useEngine } from './hooks/useEngine';
import { useNativeProfiles } from './hooks/useNativeProfiles';
import { usePlugins } from './hooks/usePlugins';
import { useCleanup } from './hooks/useCleanup';
import { Titlebar } from './components/Titlebar';
import { IconRail, type AppTab } from './components/IconRail';
import { StatusBar } from './components/StatusBar';
import { Dashboard } from './components/Dashboard';
import { LightingStudio } from './components/LightingStudio';
import { EffectsPanel } from './components/EffectsPanel';
import { ScenesView } from './components/ScenesView';
import { CleanupPanel } from './components/CleanupPanel';
import { UpdatePanel } from './components/UpdatePanel';
import { CommandPalette, type PaletteAction } from './components/CommandPalette';
import { ShortcutOverlay } from './components/ShortcutOverlay';
import type { DeviceData, Profile, ApplyProfileResult } from './types';

const TABS: AppTab[] = ['dashboard', 'lighting', 'effects', 'profiles'];
const LIVE_DEFAULT = '#ff4d8d';

function paintLive(color: string) {
    document.documentElement.style.setProperty('--live', color);
}

function typingInField(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

const EffectPreview: React.FC<{ color: string; isActive: boolean; effect: string | null }> = ({ color, isActive, effect }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!isActive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animationId = 0;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const bars = 48;
            const barWidth = canvas.width / bars;
            const t = Date.now() / 400;
            for (let i = 0; i < bars; i++) {
                const phase = (i / bars) * Math.PI * 2;
                const wave = (Math.sin(t + phase) + 1) / 2;
                const h = 12 + wave * (canvas.height * 0.72);
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.85;
                ctx.fillRect(i * barWidth + 3, canvas.height - h, barWidth - 6, h);
            }
            animationId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationId);
    }, [isActive, color, effect]);

    return (
        <div className="h-full w-full bg-graphite-950/80 relative overflow-hidden">
            {!isActive && (
                <p className="absolute inset-0 flex items-center justify-center nw-meta text-ink-mute z-10">
                    Prévia do efeito · sem captura de áudio
                </p>
            )}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={1000} height={200} />
        </div>
    );
};

export default function App() {
    const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
    const [selectedDevice, setSelectedDevice] = useState('all');
    const [globalColor, setGlobalColor] = useState(LIVE_DEFAULT);
    const [brightness, setBrightness] = useState(90);
    const [profileName, setProfileName] = useState('');
    const [showProfileDialog, setShowProfileDialog] = useState(false);
    const [showCleanupPanel, setShowCleanupPanel] = useState(false);
    const [showUpdatePanel, setShowUpdatePanel] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);

    const { connected, deviceCount, status } = useOpenRGB();
    const {
        devices,
        loading,
        scanning,
        refresh,
        rescan,
        setColor,
        setMode,
        setModeWithParams,
        saveMode,
        syncAll,
        setZoneColor,
        setSingleLed,
        resizeZone,
        setSegmentColor,
        addSegment,
        clearSegments,
    } = useDevices();
    const { profiles, createProfile, applyProfile, deleteProfile } = useProfiles();
    const nativeProfiles = useNativeProfiles();
    const { engine, loading: engineBusy, setEngineEnabled, applyEngineFromProfile } = useEngine();
    const { activeEffect, startEffect, stopEffect, toggleEffect, loading: effectsBusy, error: effectsError } = useEffects(engine.enabled);
    const plugins = usePlugins();
    const cleanup = useCleanup();
    const [conflictCount, setConflictCount] = useState(0);

    const typedDevices = devices as DeviceData[];
    const typedProfiles = profiles as Profile[];

    const paintHardware = async (color: string, level: number, scope: string) => {
        try {
            if (scope === 'all') await syncAll(color, level);
            else await setColor(parseInt(scope, 10), color, level);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { code?: string } } };
            if (axiosErr?.response?.data?.code === 'ENGINE_OFF') {
                console.warn('Engine is off — paintHardware blocked.');
                return;
            }
            throw err;
        }
    };

    const handleColorChange = async (color: string, scope?: string) => {
        setGlobalColor(color);
        paintLive(color);
        try {
            await paintHardware(color, brightness, scope ?? selectedDevice);
        } catch (error) {
            console.error('Failed to set color:', error);
        }
    };

    const handleBrightnessChange = async (value: number, scope?: string) => {
        setBrightness(value);
        try {
            await paintHardware(globalColor, value, scope ?? selectedDevice);
        } catch (error) {
            console.error('Failed to set brightness:', error);
        }
    };

    const handleApplyProfile = async (id: string) => {
        try {
            const result = await applyProfile(id) as ApplyProfileResult;
            if (result?.engine) {
                applyEngineFromProfile(result.engine);
            }
        } catch (error) {
            console.error('Failed to apply profile:', error);
        }
    };

    const handleToggleEngine = async () => {
        try {
            const next = !engine.enabled;
            if (!next) await stopEffect();
            await setEngineEnabled(next);
        } catch (error) {
            console.error('Failed to toggle engine:', error);
        }
    };

    useEffect(() => {
        paintLive(globalColor);
    }, []);

    useEffect(() => {
        void nativeProfiles.fetchProfiles();
    }, [nativeProfiles.fetchProfiles]);

    useEffect(() => {
        void cleanup.detectConflicts().then((data) => {
            setConflictCount(data?.count || 0);
        }).catch(() => setConflictCount(0));
    }, [cleanup.detectConflicts]);

    useEffect(() => {
        void refresh();
    }, [deviceCount, refresh]);

    const handleSaveProfile = async () => {
        if (!profileName.trim()) return;
        try {
            await createProfile(profileName, `Saved at ${new Date().toLocaleString()}`);
            setProfileName('');
            setShowProfileDialog(false);
        } catch (error) {
            console.error('Failed to save profile:', error);
        }
    };

    const selectedLabel =
        selectedDevice === 'all'
            ? 'sync global'
            : typedDevices.find((d) => String(d.id) === selectedDevice)?.name || 'device';

    const paletteActions = useMemo<PaletteAction[]>(() => {
        const actions: PaletteAction[] = [
            { id: 'tab-studio', label: 'Studio', hint: '1', group: 'Ir', run: () => setActiveTab('dashboard') },
            { id: 'tab-luz', label: 'Luz', hint: '2', group: 'Ir', run: () => setActiveTab('lighting') },
            { id: 'tab-fx', label: 'Efeitos', hint: '3', group: 'Ir', run: () => setActiveTab('effects') },
            { id: 'tab-cenas', label: 'Cenas', hint: '4', group: 'Ir', run: () => setActiveTab('profiles') },
            { id: 'paint-all', label: 'Pintar tudo', group: 'Luz', run: () => { setSelectedDevice('all'); handleColorChange(globalColor, 'all'); } },
            { id: 'save', label: 'Salvar cena', hint: 'Ctrl+S', group: 'Cena', run: () => setShowProfileDialog(true) },
            { id: 'cleanup', label: 'Limpeza RGB', group: 'Sistema', run: () => setShowCleanupPanel(true) },
            { id: 'update', label: 'Atualizar app e OpenRGB', group: 'Sistema', run: () => setShowUpdatePanel(true) },
            { id: 'rescan', label: 'Redigitalizar devices', group: 'Sistema', run: () => { void rescan(); } },
            {
                id: 'toggle-controle',
                label: engine.enabled ? 'Desligar Controle' : 'Ligar Controle',
                group: 'Controle',
                run: () => { void handleToggleEngine(); },
            },
            { id: 'toggle-fx', label: activeEffect ? 'Desligar efeitos' : 'Ligar efeitos', group: 'Efeito', run: () => { void toggleEffect({ color: globalColor }); } },
            { id: 'stop-fx', label: 'Parar efeito', group: 'Efeito', run: () => { void stopEffect(); } },
        ];
        typedDevices.forEach((d) => {
            actions.push({
                id: `dev-${d.id}`,
                label: d.name,
                group: 'Device',
                run: () => {
                    setSelectedDevice(String(d.id));
                    setActiveTab('lighting');
                },
            });
        });
        typedProfiles.forEach((p) => {
            actions.push({
                id: `scene-${p.id}`,
                label: p.name,
                group: 'Cena',
                run: () => { void handleApplyProfile(p.id); },
            });
        });
        nativeProfiles.profiles.forEach((name) => {
            actions.push({
                id: `orp-${name}`,
                label: `OpenRGB · ${name}`,
                group: 'Perfil',
                run: () => {
                    void nativeProfiles.load(name).then(() => refresh());
                },
            });
        });
        return actions;
    }, [typedDevices, typedProfiles, nativeProfiles.profiles, globalColor, applyProfile, stopEffect, toggleEffect, activeEffect, engine.enabled, rescan, refresh, nativeProfiles.load]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const meta = e.ctrlKey || e.metaKey;
            if (meta && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPaletteOpen((v) => !v);
                setShortcutsOpen(false);
                return;
            }
            if (e.key === 'Escape') {
                setPaletteOpen(false);
                setShortcutsOpen(false);
                setShowCleanupPanel(false);
                setShowUpdatePanel(false);
                setShowProfileDialog(false);
                return;
            }
            if (paletteOpen) return;
            if (typingInField(e.target)) return;
            if (meta && e.key.toLowerCase() === 's') {
                e.preventDefault();
                setShowProfileDialog(true);
                return;
            }
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                setShortcutsOpen((v) => !v);
                return;
            }
            if (e.key >= '1' && e.key <= '4') {
                const tab = TABS[Number(e.key) - 1];
                if (tab) setActiveTab(tab);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [paletteOpen]);

    return (
        <div className="flex flex-col h-full bg-graphite-900 text-ink">
            <Titlebar
                connected={connected}
                onSearch={() => setPaletteOpen(true)}
                engineEnabled={engine.enabled}
                engineBusy={engineBusy}
                onToggleEngine={handleToggleEngine}
            />
            <div className="flex flex-1 min-h-0">
                <IconRail
                    active={activeTab}
                    onChange={setActiveTab}
                    onCleanup={() => setShowCleanupPanel(true)}
                    onUpdate={() => setShowUpdatePanel(true)}
                    conflictCount={conflictCount}
                />
                <main className="flex-1 min-w-0 min-h-0">
                    {activeTab === 'dashboard' && (
                        <Dashboard
                            connected={connected}
                            loading={loading}
                            devices={typedDevices}
                            profiles={typedProfiles}
                            globalColor={globalColor}
                            brightness={brightness}
                            onOpenDevice={(id) => {
                                setSelectedDevice(id);
                                setActiveTab('lighting');
                            }}
                            onApplyProfile={handleApplyProfile}
                            onColor={(color) => handleColorChange(color, 'all')}
                            onBrightness={(value) => handleBrightnessChange(value, 'all')}
                            onSaveScene={() => setShowProfileDialog(true)}
                            onPaintAll={() => handleColorChange(globalColor, 'all')}
                            onRescan={() => { void rescan(); }}
                            scanning={scanning}
                            plugins={plugins.plugins}
                            nativeProfiles={nativeProfiles.profiles}
                            onLoadNative={(name) => {
                                void nativeProfiles.load(name).then(() => refresh());
                            }}
                        />
                    )}
                    {activeTab === 'lighting' && (
                        <LightingStudio
                            devices={typedDevices}
                            loading={loading}
                            scanning={scanning}
                            selectedDevice={selectedDevice}
                            onSelect={setSelectedDevice}
                            globalColor={globalColor}
                            brightness={brightness}
                            onColor={handleColorChange}
                            onBrightness={handleBrightnessChange}
                            onApply={() => handleColorChange(globalColor)}
                            onSaveProfile={() => setShowProfileDialog(true)}
                            onRescan={rescan}
                            setMode={setMode}
                            setModeWithParams={setModeWithParams}
                            saveMode={saveMode}
                            setZoneColor={setZoneColor}
                            setSingleLed={setSingleLed}
                            resizeZone={resizeZone}
                            setSegmentColor={setSegmentColor}
                            addSegment={addSegment}
                            clearSegments={clearSegments}
                        />
                    )}
                    {activeTab === 'effects' && (
                        <EffectsPanel
                            activeEffect={activeEffect}
                            startEffect={startEffect}
                            stopEffect={stopEffect}
                            toggleEffect={toggleEffect}
                            effectsBusy={effectsBusy}
                            currentColor={globalColor}
                            visualizer={<EffectPreview color={globalColor} isActive={Boolean(activeEffect)} effect={activeEffect} />}
                            engineEnabled={engine.enabled}
                            pluginEffects={plugins.pluginEffects}
                            onStartPluginEffect={plugins.startPluginEffect}
                            onStopPluginEffect={plugins.stopPluginEffect}
                        />
                    )}
                    {activeTab === 'profiles' && (
                        <ScenesView
                            profiles={typedProfiles}
                            activeSceneId={engine.activeSceneId}
                            onApply={handleApplyProfile}
                            onDelete={deleteProfile}
                            onCreate={() => setShowProfileDialog(true)}
                            native={nativeProfiles}
                            onNativeLoaded={() => { void refresh(); }}
                        />
                    )}
                </main>
            </div>
            <StatusBar
                deviceCount={deviceCount}
                selectedLabel={selectedLabel}
                activeEffect={activeEffect}
                effectsError={effectsError}
                engineEnabled={engine.enabled}
                sdkPort={status?.sdkPort}
                protocolVersion={status?.protocolVersion}
            />

            {showProfileDialog && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowProfileDialog(false)}>
                    <div className="nw-dock p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <h2 className="nw-display text-[22px] mb-3">Salvar cena</h2>
                        <label htmlFor="scene-name" className="nw-kicker block text-ink-mute mb-1.5">
                            Nome da cena
                        </label>
                        <input
                            id="scene-name"
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Ex. noite, streaming"
                            className="w-full bg-graphite-950 border border-ink/10 px-3 py-2 nw-body mb-3 rounded-lg"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleSaveProfile();
                            }}
                        />
                        <div className="flex gap-2">
                            <button type="button" className="flex-1 min-h-10 py-2 nw-body border border-ink/15 text-ink-dim rounded-lg" onClick={() => setShowProfileDialog(false)}>
                                Cancelar
                            </button>
                            <button type="button" className="flex-1 min-h-10 py-2 nw-body font-semibold bg-ember text-graphite-950 rounded-lg" onClick={handleSaveProfile}>
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCleanupPanel && <CleanupPanel onClose={() => setShowCleanupPanel(false)} />}
            {showUpdatePanel && <UpdatePanel onClose={() => setShowUpdatePanel(false)} />}
            <CommandPalette open={paletteOpen} actions={paletteActions} onClose={() => setPaletteOpen(false)} />
            <ShortcutOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </div>
    );
}
