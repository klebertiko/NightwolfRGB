import React, { useEffect, useMemo, useState } from 'react';
import { EffectPreview } from './EffectPreview';
import { EffectThumb, type ThumbKind } from './EffectThumb';
import {
    DIRECT_EFFECTS,
    pluginLibraryId,
    readInstalledLibrary,
    writeInstalledLibrary,
} from '../lib/installedLibrary';
import { customNeedsBuilder, isLive, liveChipLabel } from '../lib/effectWorkbenchState';
import type { PluginEffectsResponse } from '../types';

type CatalogCategory = 'all' | 'direct' | 'openrgb';

type CatalogItem = {
    id: string;
    name: string;
    source: 'direct' | 'openrgb';
    blurb?: string;
    thumbKind: ThumbKind;
};

const CATEGORY_LABELS: Record<CatalogCategory, string> = {
    all: 'Todos',
    direct: 'Direct',
    openrgb: 'OpenRGB',
};

const FEATURED_COUNT = 4;

interface DiscoverViewProps {
    activeEffect: string | null;
    startEffect: (type: string, options: Record<string, unknown>) => Promise<void>;
    stopEffect: () => Promise<void>;
    effectsBusy?: boolean;
    currentColor: string;
    engineEnabled?: boolean;
    pluginEffects?: PluginEffectsResponse | null;
    onStartPluginEffect?: (name: string) => Promise<void>;
    onStopPluginEffect?: (name: string) => Promise<void>;
    onOpenConsole?: (effectId: string) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
    activeEffect,
    startEffect,
    stopEffect,
    effectsBusy,
    currentColor,
    engineEnabled = true,
    pluginEffects,
    onStartPluginEffect,
    onStopPluginEffect,
    onOpenConsole,
}) => {
    const [speed, setSpeed] = useState(50);
    const [selectedId, setSelectedId] = useState<string | null>('breathing');
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<CatalogCategory>('all');
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
        if (!activeEffect) return;
        rememberInstalled(activeEffect);
    }, [activeEffect]);

    const items: CatalogItem[] = useMemo(() => {
        const direct: CatalogItem[] = DIRECT_EFFECTS.filter((e) => {
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

        const plugins: CatalogItem[] =
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

    const featured = useMemo(() => {
        if (q || category !== 'all') return [];
        return DIRECT_EFFECTS.slice(0, FEATURED_COUNT).map((e) => ({
            id: e.id,
            name: e.name,
            source: 'direct' as const,
            blurb: e.blurb,
            thumbKind: e.kind,
        }));
    }, [q, category]);

    const selected = items.find((i) => i.id === selectedId) ?? featured.find((i) => i.id === selectedId) ?? null;
    const nameOf = (id: string) => {
        const d = DIRECT_EFFECTS.find((e) => e.id === id);
        if (d) return d.name;
        if (id.startsWith('plugin:')) return id.slice('plugin:'.length);
        return id;
    };
    const live = isLive(activeEffect, selectedId);
    const chip = liveChipLabel(activeEffect, selectedId, nameOf);
    const canApply = Boolean(selectedId) && engineEnabled && !effectsBusy && !customNeedsBuilder(selectedId);

    const onApply = async (id: string) => {
        if (customNeedsBuilder(id)) {
            onOpenConsole?.(id);
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
    };

    const onStop = async () => {
        const plugin = pluginList.find((p) => p.name === activeEffect);
        if (plugin) await onStopPluginEffect?.(plugin.name);
        await stopEffect();
    };

    return (
        <div
            data-testid="discover-page"
            data-discover-layout="catalog-browse"
            className="nw-discover flex h-full min-h-0"
        >
            <div className="nw-discover-main flex flex-col min-h-0 flex-1 min-w-0 overflow-y-auto">
                <header className="px-4 pt-3 pb-3 shrink-0 space-y-3 border-b border-ink/10">
                    <div>
                        <h1 className="nw-display text-ink">Explorar</h1>
                        <p className="nw-body text-ink-mute mt-1">
                            Catálogo honesto — Aplicar envia para o hardware e guarda na Biblioteca.
                        </p>
                    </div>
                    <input
                        type="search"
                        data-testid="discover-search"
                        placeholder="Buscar efeitos"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full min-h-10 px-3 rounded-lg border border-ink/10 bg-graphite-950 nw-body text-ink placeholder:text-ink-mute"
                    />
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria">
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
                </header>

                {featured.length > 0 && (
                    <section data-testid="discover-featured" className="nw-discover-featured px-4 py-3 shrink-0">
                        <p className="nw-kicker text-ink-mute mb-2">Em destaque</p>
                        <div className="flex gap-3 overflow-x-auto pb-1">
                            {featured.map((item) => {
                                const on = selectedId === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        data-discover-featured-card={item.id}
                                        data-selected={on ? 'true' : 'false'}
                                        onClick={() => setSelectedId(item.id)}
                                        className={`nw-discover-hero shrink-0 text-left rounded-lg border overflow-hidden ${
                                            on ? 'border-ember' : 'border-ink/10'
                                        }`}
                                    >
                                        <EffectThumb
                                            kind={item.thumbKind}
                                            color={currentColor}
                                            live={activeEffect === item.id}
                                            variant="spotlight"
                                            className="nw-discover-hero-thumb"
                                        />
                                        <span className="block px-2.5 py-2 bg-graphite-800">
                                            <span className="nw-body text-ink block truncate">{item.name}</span>
                                            <span className="nw-meta text-ink-mute">{item.blurb}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section data-testid="discover-grid" className="nw-discover-grid px-4 py-3 flex-1">
                    <p className="nw-kicker text-ink-mute mb-2">Catálogo</p>
                    {items.length === 0 ? (
                        <p className="nw-body text-ink-mute py-6">Nenhum efeito neste filtro.</p>
                    ) : (
                        <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
                            {items.map((item) => {
                                const on = selectedId === item.id;
                                const rowLive = activeEffect === item.id;
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            data-discover-card={item.id}
                                            data-selected={on ? 'true' : 'false'}
                                            onClick={() => setSelectedId(item.id)}
                                            className={`nw-discover-card w-full text-left rounded-lg border overflow-hidden ${
                                                on ? 'border-ember' : 'border-ink/10'
                                            }`}
                                        >
                                            <EffectThumb
                                                kind={item.thumbKind}
                                                color={currentColor}
                                                live={rowLive}
                                                variant="card"
                                                className="nw-discover-card-thumb"
                                            />
                                            <span className="block px-2.5 py-2 bg-graphite-800">
                                                <span className="nw-body text-ink block truncate">{item.name}</span>
                                                <span className="nw-meta text-ink-mute">
                                                    {item.source === 'direct' ? 'Direct' : 'OpenRGB'}
                                                    {rowLive ? ' · ao vivo' : ''}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>

            <aside
                data-testid="discover-detail"
                className="nw-discover-detail flex flex-col min-h-0 border-l border-ink/10"
            >
                {!engineEnabled && (
                    <p className="shrink-0 px-4 py-2 nw-body text-ink-mute border-b border-ink/10 bg-graphite-900">
                        Motor desligado — ligue o Controle na barra para aplicar efeitos.
                    </p>
                )}
                <div data-testid="discover-preview" className="nw-discover-preview shrink-0">
                    <EffectPreview color={currentColor} effect={selectedId} isLive={live} />
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="nw-body font-medium text-ink truncate">
                                {selected?.name ?? 'Selecione um efeito'}
                            </p>
                            {selected?.blurb && (
                                <p className="nw-body text-ink-mute mt-0.5">{selected.blurb}</p>
                            )}
                        </div>
                        {chip && (
                            <span className="nw-chip shrink-0" data-testid="discover-live-chip">
                                live · {chip}
                            </span>
                        )}
                    </div>

                    {!customNeedsBuilder(selectedId) && (
                        <div>
                            <div className="flex justify-between nw-kicker text-ink-mute mb-2">
                                <span>Velocidade</span>
                                <span className="nw-meta">{speed}%</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={100}
                                value={speed}
                                disabled={!selectedId}
                                onChange={(e) => setSpeed(parseInt(e.target.value, 10))}
                                className="w-full"
                                aria-label="Velocidade"
                            />
                        </div>
                    )}

                    {customNeedsBuilder(selectedId) && (
                        <p className="nw-body text-ink-mute">
                            Sequência abre no console de Efeitos — use Abrir no console.
                        </p>
                    )}

                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            data-testid="discover-apply"
                            disabled={!canApply || !selectedId}
                            onClick={() => {
                                if (selectedId) void onApply(selectedId);
                            }}
                            className="w-full min-h-10 px-3 nw-body font-medium rounded-lg bg-ember text-graphite-950 disabled:opacity-40"
                        >
                            Aplicar
                        </button>
                        <button
                            type="button"
                            data-testid="discover-open-console"
                            disabled={!selectedId}
                            onClick={() => {
                                if (selectedId) onOpenConsole?.(selectedId);
                            }}
                            className="w-full min-h-10 px-3 nw-body rounded-lg border border-ink/20 text-ink disabled:opacity-40"
                        >
                            Abrir no console
                        </button>
                        <button
                            type="button"
                            data-testid="discover-stop"
                            disabled={!activeEffect || effectsBusy}
                            onClick={() => {
                                void onStop();
                            }}
                            className="w-full min-h-10 px-3 nw-body rounded-lg border border-ink/20 text-ink disabled:opacity-40"
                        >
                            Parar
                        </button>
                    </div>
                </div>
            </aside>
        </div>
    );
};
