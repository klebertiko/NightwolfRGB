import React, { useEffect, useMemo, useState } from 'react';
import { EffectWorkbench, type WorkbenchItem } from './EffectWorkbench';
import {
    availableLibraryFilters,
    filterAndSortInstalledEntries,
    pluginLibraryId,
    readInstalledLibrary,
    resolveInstalledEntries,
    writeInstalledLibrary,
    type LibraryFilter,
    type LibrarySort,
} from '../lib/installedLibrary';
import { customNeedsBuilder } from '../lib/effectWorkbenchState';
import type { PluginEffectsResponse } from '../types';

interface LibraryViewProps {
    activeEffect: string | null;
    startEffect: (type: string, options: Record<string, unknown>) => Promise<void>;
    stopEffect: () => Promise<void>;
    currentColor: string;
    engineEnabled?: boolean;
    pluginEffects?: PluginEffectsResponse | null;
    onStartPluginEffect?: (name: string) => Promise<void>;
    onStopPluginEffect?: (name: string) => Promise<void>;
    onOpenDiscover?: () => void;
}

const FILTER_LABELS: Record<LibraryFilter, string> = {
    all: 'Todos',
    direct: 'Direct',
    openrgb: 'OpenRGB',
    live: 'Ao vivo',
};

export const LibraryView: React.FC<LibraryViewProps> = ({
    activeEffect,
    startEffect,
    stopEffect,
    currentColor,
    engineEnabled = true,
    pluginEffects,
    onStartPluginEffect,
    onStopPluginEffect,
    onOpenDiscover,
}) => {
    const [installedLibrary, setInstalledLibrary] = useState<string[]>(() => readInstalledLibrary());
    const [speed, setSpeed] = useState(50);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<LibraryFilter>('all');
    const [sort, setSort] = useState<LibrarySort>('recent');
    const [showBuilder, setShowBuilder] = useState(false);

    const pluginList = pluginEffects?.effects || [];

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

    useEffect(() => {
        setInstalledLibrary(readInstalledLibrary());
    }, []);

    useEffect(() => {
        if (customNeedsBuilder(selectedId)) setShowBuilder(true);
        else setShowBuilder(false);
    }, [selectedId]);

    const allInstalledEntries = useMemo(
        () => resolveInstalledEntries(installedLibrary, pluginList),
        [installedLibrary, pluginList],
    );

    const isEmpty = allInstalledEntries.length === 0;

    const filterChips = useMemo(
        () => availableLibraryFilters(allInstalledEntries, activeEffect),
        [allInstalledEntries, activeEffect],
    );

    const searchedEntries = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allInstalledEntries;
        return allInstalledEntries.filter((e) => {
            const name = e.kind === 'direct' ? e.effect.name : e.name;
            const blurb = e.kind === 'direct' ? e.effect.blurb : e.description || '';
            return name.toLowerCase().includes(q) || blurb.toLowerCase().includes(q);
        });
    }, [allInstalledEntries, query]);

    const filtered = useMemo(
        () =>
            filterAndSortInstalledEntries(searchedEntries, {
                filter,
                sort,
                activeEffect,
            }),
        [searchedEntries, filter, sort, activeEffect],
    );

    const items: WorkbenchItem[] = useMemo(
        () =>
            filtered.map((e) =>
                e.kind === 'direct'
                    ? {
                          id: e.effect.id,
                          name: e.effect.name,
                          source: 'direct' as const,
                          blurb: e.effect.blurb,
                          thumbKind: e.effect.kind,
                      }
                    : {
                          id: pluginLibraryId(e.name),
                          name: e.name,
                          source: 'openrgb' as const,
                          blurb: e.description,
                          thumbKind: 'plugin' as const,
                      },
            ),
        [filtered],
    );

    useEffect(() => {
        if (selectedId && items.some((i) => i.id === selectedId)) return;
        setSelectedId(items[0]?.id ?? null);
    }, [items, selectedId]);

    const resolveName = (id: string) => {
        const hit = items.find((i) => i.id === id);
        if (hit) return hit.name;
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
    };

    const onStop = async () => {
        await stopEffect();
        if (activeEffect?.startsWith('plugin:')) {
            await onStopPluginEffect?.(activeEffect.slice('plugin:'.length));
        }
    };

    return (
        <EffectWorkbench
            title="Biblioteca"
            testIdRoot="library-page"
            destinationAttr
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            activeEffect={activeEffect}
            speed={speed}
            onSpeed={setSpeed}
            currentColor={currentColor}
            engineEnabled={engineEnabled}
            onApply={onApply}
            onStop={onStop}
            showBuilder={showBuilder}
            startEffect={startEffect}
            resolveName={resolveName}
            headerExtra={
                isEmpty ? (
                    <div
                        data-testid="library-empty-banner"
                        className="space-y-2 rounded-sm border border-ink/10 bg-graphite-900 px-2.5 py-2"
                    >
                        <p className="nw-body text-ink-mute">
                            Nada na Biblioteca ainda — use Aplicar em Explorar para guardar efeitos aqui.
                        </p>
                        {onOpenDiscover && (
                            <button
                                type="button"
                                data-testid="library-open-discover"
                                onClick={onOpenDiscover}
                                className="min-h-9 px-3 nw-body rounded-lg border border-ink/15 text-ink"
                            >
                                Ir para Explorar
                            </button>
                        )}
                    </div>
                ) : null
            }
            searchSlot={
                <input
                    type="search"
                    data-testid="library-search"
                    placeholder="Buscar na Biblioteca"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    disabled={isEmpty}
                    className="w-full min-h-10 px-3 rounded-lg border border-ink/10 bg-graphite-950 nw-body text-ink placeholder:text-ink-mute disabled:opacity-40"
                />
            }
            filterSlot={
                isEmpty ? null : (
                    <div className="space-y-2">
                        <div
                            className="flex flex-wrap gap-1.5 nw-workbench-filters"
                            data-testid="library-filters"
                            role="group"
                            aria-label="Filtros da Biblioteca"
                        >
                            {filterChips.map((id) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setFilter(id)}
                                    className={`min-h-9 px-3 nw-body rounded-lg border ${
                                        filter === id
                                            ? 'border-ember text-ember bg-graphite-700'
                                            : 'border-ink/15 text-ink-dim'
                                    }`}
                                >
                                    {FILTER_LABELS[id]}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-1" role="group" aria-label="Ordenar">
                            {(
                                [
                                    ['recent', 'Recentes'],
                                    ['az', 'A–Z'],
                                ] as const
                            ).map(([id, label]) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setSort(id)}
                                    className={`min-h-9 px-3 nw-body rounded-lg border ${
                                        sort === id
                                            ? 'border-ember text-ember bg-graphite-700'
                                            : 'border-ink/15 text-ink-dim'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }
            emptyMaster={
                <li className="px-2 py-6 nw-body text-ink-mute">
                    {isEmpty ? 'Biblioteca vazia.' : 'Nenhum efeito neste filtro.'}
                </li>
            }
        />
    );
};
