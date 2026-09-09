import React, { useState } from 'react';
import { CustomEffectBuilder } from './CustomEffectBuilder';
import { EffectSwitch } from './EffectSwitch';
import type { PluginEffectsResponse } from '../types';

interface EffectsPanelProps {
    activeEffect: string | null;
    startEffect: (type: string, options: Record<string, unknown>) => Promise<void>;
    stopEffect: () => Promise<void>;
    toggleEffect: (fallback?: Record<string, unknown>) => Promise<void>;
    effectsBusy?: boolean;
    currentColor: string;
    visualizer: React.ReactNode;
    engineEnabled?: boolean;
    pluginEffects?: PluginEffectsResponse | null;
    onStartPluginEffect?: (name: string) => Promise<void>;
    onStopPluginEffect?: (name: string) => Promise<void>;
}

const EFFECTS = [
    { id: 'static', name: 'Estático' },
    { id: 'breathing', name: 'Respirar' },
    { id: 'strobing', name: 'Estrobo' },
    { id: 'rainbow', name: 'Arco-íris' },
    { id: 'spectrum', name: 'Espectro' },
    { id: 'custom', name: 'Sequência' },
];

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
    activeEffect,
    startEffect,
    stopEffect,
    toggleEffect,
    effectsBusy,
    currentColor,
    visualizer,
    engineEnabled = true,
    pluginEffects,
    onStartPluginEffect,
    onStopPluginEffect,
}) => {
    const [speed, setSpeed] = useState(50);
    const [selectedType, setSelectedType] = useState('breathing');
    const live = activeEffect === selectedType;
    const selectedName = EFFECTS.find((e) => e.id === selectedType)?.name || selectedType;
    const pluginAvailable = Boolean(pluginEffects?.available);
    const pluginList = pluginEffects?.effects || [];

    return (
        <div className="h-full grid grid-cols-[minmax(0,1fr)_16.5rem] min-h-0 p-2 bg-graphite-950">
            <section className="min-w-0 relative mr-2 rounded-[1.5rem] overflow-hidden nw-stage">
                <div className="absolute inset-0" style={{ background: currentColor, opacity: live ? 1 : 0.4 }} />
                <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-transparent to-transparent" />
                <p className="absolute top-3 left-3 nw-chip">
                    {activeEffect ? `live · ${selectedName}` : 'idle'}
                </p>
                <p className="absolute top-3 right-3 nw-meta text-ink-mute">
                    Direct · sem áudio
                </p>
                <div className="absolute bottom-3 left-3 right-3 h-28 rounded-xl overflow-hidden">{visualizer}</div>
            </section>
            <aside className="overflow-y-auto p-3 space-y-3 nw-dock m-0 relative">
                {!engineEnabled && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-graphite-950/80 rounded-[inherit]">
                        <p className="nw-meta text-ink-mute text-center px-4">Ligue o Controle para usar efeitos.</p>
                    </div>
                )}
                <EffectSwitch
                    on={Boolean(activeEffect)}
                    busy={effectsBusy}
                    disabled={!engineEnabled}
                    onToggle={() => { void toggleEffect({ speed, color: currentColor }); }}
                    label="Efeitos"
                />
                <p className="nw-kicker text-ink-mute">Nightwolf · Direct</p>
                <div className="grid grid-cols-2 gap-1.5">
                    {EFFECTS.map((effect) => (
                        <button
                            key={effect.id}
                            type="button"
                            disabled={!engineEnabled}
                            onClick={() => {
                                setSelectedType(effect.id);
                                if (effect.id !== 'custom') void startEffect(effect.id, { speed, color: currentColor });
                            }}
                            className={`min-h-11 px-2.5 py-2 text-xs text-left rounded-xl border disabled:opacity-40 ${
                                selectedType === effect.id
                                    ? 'border-ember text-ink bg-ember/10'
                                    : 'border-ink/10 text-ink-dim hover:text-ink'
                            }`}
                        >
                            {effect.name}
                            {activeEffect === effect.id && <span className="nw-meta text-ember block">live</span>}
                        </button>
                    ))}
                </div>
                {selectedType === 'custom' ? (
                    <CustomEffectBuilder startEffect={startEffect} stopEffect={stopEffect} isActive={activeEffect === 'custom'} />
                ) : (
                    <label className="flex items-center gap-2 nw-meta text-ink-mute">
                        Velocidade
                        <input
                            type="range"
                            min={1}
                            max={100}
                            value={speed}
                            onChange={(e) => {
                                const next = parseInt(e.target.value, 10);
                                setSpeed(next);
                                if (live) void startEffect(selectedType, { speed: next, color: currentColor });
                            }}
                            className="flex-1"
                            aria-label="Velocidade do efeito"
                        />
                        <span className="text-ember w-8 tabular-nums">{speed}</span>
                    </label>
                )}

                <div className="pt-2 border-t border-ink/10 space-y-2">
                    <p className="nw-kicker text-ink-mute">Plugin OpenRGB Effects</p>
                    {!pluginAvailable && (
                        <p className="nw-meta text-ink-dim">
                            {pluginEffects?.reason || 'Não carregado neste OpenRGB. Não há loja de plugins.'}
                        </p>
                    )}
                    {pluginAvailable && pluginList.length === 0 && (
                        <p className="nw-meta text-ink-dim">Plugin no ar, sem instâncias nomeadas.</p>
                    )}
                    {pluginAvailable && pluginList.map((fx) => (
                        <div key={fx.name} className="flex items-center gap-2">
                            <span className="min-w-0 flex-1">
                                <span className="nw-body block text-ink truncate">{fx.name}</span>
                                <span className="nw-meta text-ink-mute block truncate">{fx.description || (fx.enabled ? 'ligado' : 'parado')}</span>
                            </span>
                            {fx.enabled ? (
                                <button
                                    type="button"
                                    disabled={!engineEnabled}
                                    onClick={() => { void onStopPluginEffect?.(fx.name); }}
                                    className="min-h-8 px-2.5 text-xs rounded-md border border-ink/15 text-ink-dim"
                                >
                                    Parar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!engineEnabled}
                                    onClick={() => { void onStartPluginEffect?.(fx.name); }}
                                    className="min-h-8 px-2.5 text-xs rounded-md border border-ember/40 text-ember"
                                >
                                    Ligar
                                </button>
                            )}
                        </div>
                    ))}
                    {pluginAvailable && (
                        <p className="nw-meta text-ink-mute">
                            O SDK só liga/desliga por nome. Velocidade e áudio ficam no OpenRGB.
                        </p>
                    )}
                </div>
            </aside>
        </div>
    );
};
