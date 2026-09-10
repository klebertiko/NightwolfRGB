import React from 'react';
import { EffectPreview } from './EffectPreview';
import { EffectThumb, type ThumbKind } from './EffectThumb';
import { CustomEffectBuilder } from './CustomEffectBuilder';
import {
    customNeedsBuilder,
    isLive,
    liveChipLabel,
} from '../lib/effectWorkbenchState';

export type WorkbenchItem = {
    id: string;
    name: string;
    source: 'direct' | 'openrgb';
    blurb?: string;
    thumbKind?: ThumbKind;
};

export type EffectWorkbenchProps = {
    title: string;
    testIdRoot: string;
    items: WorkbenchItem[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    activeEffect: string | null;
    speed: number;
    onSpeed: (n: number) => void;
    currentColor: string;
    engineEnabled: boolean;
    effectsBusy?: boolean;
    searchSlot: React.ReactNode;
    filterSlot?: React.ReactNode;
    emptyMaster?: React.ReactNode;
    onApply: (id: string) => Promise<void>;
    onStop: () => Promise<void>;
    showBuilder: boolean;
    canvasSlot?: React.ReactNode;
    headerExtra?: React.ReactNode;
    startEffect: (type: string, options: Record<string, unknown>) => Promise<void>;
    resolveName?: (id: string) => string;
    destinationAttr?: boolean;
};

export const EffectWorkbench: React.FC<EffectWorkbenchProps> = ({
    title,
    testIdRoot,
    items,
    selectedId,
    onSelect,
    activeEffect,
    speed,
    onSpeed,
    currentColor,
    engineEnabled,
    effectsBusy,
    searchSlot,
    filterSlot,
    emptyMaster,
    onApply,
    onStop,
    showBuilder,
    canvasSlot,
    headerExtra,
    startEffect,
    resolveName,
    destinationAttr,
}) => {
    const selected = items.find((i) => i.id === selectedId) ?? null;
    const nameOf = resolveName ?? ((id: string) => items.find((i) => i.id === id)?.name || id);
    const live = isLive(activeEffect, selectedId);
    const chip = liveChipLabel(activeEffect, selectedId, nameOf);
    const needsBuilder = customNeedsBuilder(selectedId);
    const canApply = Boolean(selectedId) && engineEnabled && !effectsBusy;

    return (
        <div
            data-testid={testIdRoot}
            data-workbench-layout="master-detail"
            {...(destinationAttr ? { 'data-library-destination': 'true' } : {})}
            className="nw-workbench flex h-full min-h-0 gap-0"
        >
            <aside data-testid="workbench-master" className="nw-workbench-master flex flex-col min-h-0 border-r border-ink/10">
                <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
                    <h1 className="nw-display text-ink">{title}</h1>
                    {headerExtra}
                    {searchSlot}
                    {filterSlot}
                </div>
                <ul className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 space-y-0.5">
                    {items.map((item) => {
                        const rowLive = activeEffect === item.id;
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    data-workbench-row={item.id}
                                    data-selected={selectedId === item.id ? 'true' : 'false'}
                                    onClick={() => onSelect(item.id)}
                                    className="nw-workbench-row w-full flex items-center gap-2.5 min-h-10 px-2 text-left rounded-sm"
                                >
                                    <EffectThumb
                                        kind={item.thumbKind || (item.source === 'openrgb' ? 'plugin' : 'static')}
                                        color={currentColor}
                                        live={rowLive}
                                        variant="row"
                                        className="nw-workbench-row-thumb shrink-0"
                                    />
                                    <span className="min-w-0 flex-1">
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
                    {items.length === 0 && emptyMaster}
                </ul>
            </aside>

            <section data-testid="workbench-detail" className="nw-workbench-detail flex flex-col min-h-0 flex-1 min-w-0">
                {!engineEnabled && (
                    <p className="shrink-0 px-4 py-2 nw-body text-ink-mute border-b border-ink/10 bg-graphite-900">
                        Motor desligado — ligue o Controle na barra para aplicar efeitos.
                    </p>
                )}
                <div data-testid="workbench-preview" className="nw-workbench-preview shrink-0">
                    <EffectPreview color={currentColor} effect={selectedId} isLive={live} />
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="nw-body font-medium text-ink truncate">
                                {selected?.name ?? 'Nenhum efeito selecionado'}
                            </p>
                            {selected?.blurb && (
                                <p className="nw-body text-ink-mute mt-0.5">{selected.blurb}</p>
                            )}
                        </div>
                        {chip && (
                            <span className="nw-chip shrink-0" data-testid="workbench-live-chip">
                                live · {chip}
                            </span>
                        )}
                    </div>

                    {!needsBuilder && (
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
                                onChange={(e) => onSpeed(parseInt(e.target.value, 10))}
                                className="w-full"
                                aria-label="Velocidade"
                            />
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={!canApply || !selectedId}
                            onClick={() => {
                                if (selectedId) void onApply(selectedId);
                            }}
                            className="flex-1 min-h-10 px-3 nw-body font-medium rounded-lg bg-ember text-graphite-950 disabled:opacity-40"
                        >
                            Aplicar
                        </button>
                        <button
                            type="button"
                            disabled={!activeEffect || effectsBusy}
                            onClick={() => {
                                void onStop();
                            }}
                            className="flex-1 min-h-10 px-3 nw-body rounded-lg border border-ink/20 text-ink disabled:opacity-40"
                        >
                            Parar
                        </button>
                    </div>

                    {needsBuilder && showBuilder && (
                        <CustomEffectBuilder
                            startEffect={startEffect}
                            stopEffect={onStop}
                            isActive={activeEffect === 'custom'}
                        />
                    )}
                    {needsBuilder && !showBuilder && (
                        <p className="nw-body text-ink-mute">
                            Sequência: use Aplicar para abrir o editor, depois Tocar.
                        </p>
                    )}

                    {canvasSlot}
                </div>
            </section>
        </div>
    );
};
