import React, { useEffect, useMemo, useState } from 'react';
import { EffectWorkbench, type WorkbenchItem } from './EffectWorkbench';
import { CanvasLayoutMap } from './CanvasLayoutMap';
import {
    DIRECT_EFFECTS,
    pluginLibraryId,
    readInstalledLibrary,
    writeInstalledLibrary,
} from '../lib/installedLibrary';
import { customNeedsBuilder } from '../lib/effectWorkbenchState';
import type { PluginEffectsResponse } from '../types';

interface EffectsPanelProps {
    activeEffect: string | null;
    startEffect: (type: string, options: Record<string, unknown>) => Promise<void>;
    stopEffect: () => Promise<void>;
    toggleEffect: (fallback?: Record<string, unknown>) => Promise<void>;
    effectsBusy?: boolean;
    currentColor: string;
    engineEnabled?: boolean;
    pluginEffects?: PluginEffectsResponse | null;
    onStartPluginEffect?: (name: string) => Promise<void>;
    onStopPluginEffect?: (name: string) => Promise<void>;
    /** Seed selection when navigating from Explorar → Abrir no console. */
    initialSelectedId?: string | null;
}

type CatalogCategory = 'all' | 'direct' | 'openrgb';

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
    all: 'Todos',
    direct: 'Direct',
    openrgb: 'OpenRGB',
};

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
    activeEffect,
    startEffect,
    stopEffect,
    toggleEffect: _toggleEffect,
    effectsBusy,
    currentColor,
    engineEnabled = true,
    pluginEffects,
    onStartPluginEffect,
    onStopPluginEffect,
    initialSelectedId = null,
}) => {
    const [speed, setSpeed] = useState(50);
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId || 'breathing');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<CatalogCategory>('all');
    const [showBuilder, setShowBuilder] = useState(false);
    const [showCanvas, setShowCanvas] = useState(false);
    const [, setInstalledLibrary] = useState<string[]>(() => readInstalledLibrary());

    const pluginList = pluginEffects?.effects || [];
    const q = query.trim().toLowerCase();

    const rememberInstalled = (id: string) => {
        setInstalledLibrary((prev) => {
            if (prev.includes(id)) return prev;
            const next = [id, ...prev];
            writeInstalledLibrary(next);
            return next;
        });
    };

    useEffect(() => {
        if (!initialSelectedId) return;
        setSelectedId(initialSelectedId);
    }, [initialSelectedId]);

    useEffect(() => {
        if (!activeEffect) return;
        rememberInstalled(activeEffect);
    }, [activeEffect]);

    useEffect(() => {
        if (customNeedsBuilder(selectedId)) setShowBuilder(true);
        else setShowBuilder(false);
    }, [selectedId]);

    const items: WorkbenchItem[] = useMemo(() => {
        const direct: WorkbenchItem[] = DIRECT_EFFECTS.filter((e) => {
            if (category === 'openrgb') return false;
            if (!q) return true;
            return e.name.toLowerCase().includes(q) || e.blurb.toLowerCase().includes(q) || e.id.includes(q);
        }).map((e) => ({
            id: e.id,
            name: e.name,
            source: 'direct' as const,
            blurb: e.blurb,
            thumbKind: e.kind,
        }));

        const plugins: WorkbenchItem[] =
            category === 'direct'
                ? []
                : pluginList
                      .filter((fx) => {
                          if (!q) return true;
                          return (
                              fx.name.toLowerCase().includes(q) ||
                              (fx.description || '').toLowerCase().includes(q)
                          );
                      })
                      .map((fx) => ({
                          id: pluginLibraryId(fx.name),
                          name: fx.name,
                          source: 'openrgb' as const,
                          blurb: fx.description,
                          thumbKind: 'plugin' as const,
                      }));

        return [...direct, ...plugins];
    }, [category, q, pluginList]);

    const resolveName = (id: string) => {
        const d = DIRECT_EFFECTS.find((e) => e.id === id);
        if (d) return d.name;
        if (id.startsWith('plugin:')) return id.slice('plugin:'.length);
        return id;
    };

    const onApply = async (id: string) => {
        if (customNeedsBuilder(id)) {
            setSelectedId('custom');
            setShowBuilder(true);
            return;
        }
        if (id.startsWith('plugin:')) {
            const name = id.slice('plugin:'.length);
            await onStartPluginEffect?.(name);
            rememberInstalled(id);
            return;
        }
        await startEffect(id, { speed, color: currentColor });
        rememberInstalled(id);
        if (id === 'canvas-wave') setShowCanvas(true);
    };

    const onStop = async () => {
        const plugin = pluginList.find((p) => p.name === activeEffect);
        if (plugin) await onStopPluginEffect?.(plugin.name);
        await stopEffect();
    };

    const canvasRelevant = selectedId === 'canvas-wave' || activeEffect === 'canvas-wave';

    return (
        <EffectWorkbench
            title="Efeitos"
            testIdRoot="effects-console"
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            activeEffect={activeEffect}
            speed={speed}
            onSpeed={setSpeed}
            currentColor={currentColor}
            engineEnabled={engineEnabled}
            effectsBusy={effectsBusy}
            onApply={onApply}
            onStop={onStop}
            showBuilder={showBuilder}
            startEffect={startEffect}
            resolveName={resolveName}
            searchSlot={
                <input
                    type="search"
                    data-testid="effects-search"
                    placeholder="Buscar no console"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full min-h-10 px-3 rounded-lg border border-ink/10 bg-graphite-950 nw-body text-ink placeholder:text-ink-mute"
                />
            }
            filterSlot={
                <div className="flex flex-wrap gap-1.5 nw-workbench-filters" role="group" aria-label="Categoria">
                    {(Object.keys(CATEGORY_LABELS) as CatalogCategory[]).map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setCategory(id)}
                            className={`min-h-9 px-3 nw-body rounded-lg border ${
                                category === id
                                    ? 'border-ember text-ember bg-graphite-700'
                                    : 'border-ink/15 text-ink-dim'
                            }`}
                        >
                            {CATEGORY_LABELS[id]}
                        </button>
                    ))}
                </div>
            }
            emptyMaster={
                <li className="px-2 py-4 nw-body text-ink-mute">Nenhum efeito neste filtro.</li>
            }
            canvasSlot={
                canvasRelevant ? (
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => setShowCanvas((v) => !v)}
                            className="min-h-9 px-3 nw-body rounded-lg border border-ink/15 text-ink-dim"
                        >
                            {showCanvas ? 'Ocultar mapa' : 'Mapa'}
                        </button>
                        {showCanvas && <CanvasLayoutMap />}
                    </div>
                ) : null
            }
        />
    );
};
