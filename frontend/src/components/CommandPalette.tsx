import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

export type PaletteAction = {
    id: string;
    label: string;
    hint?: string;
    group: string;
    run: () => void;
};

interface CommandPaletteProps {
    open: boolean;
    actions: PaletteAction[];
    onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, actions, onClose }) => {
    const [query, setQuery] = useState('');
    const [index, setIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return actions;
        return actions.filter((a) => `${a.label} ${a.group} ${a.hint || ''}`.toLowerCase().includes(q));
    }, [actions, query]);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setIndex(0);
        const t = window.setTimeout(() => inputRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [open]);

    useEffect(() => {
        setIndex(0);
    }, [query]);

    if (!open) return null;

    const run = (action?: PaletteAction) => {
        if (!action) return;
        onClose();
        action.run();
    };

    return (
        <div className="nw-search app-no-drag fixed inset-0 z-[80]" onClick={onClose}>
            <div className="absolute inset-0 bg-graphite-950/55" />
            <div
                role="dialog"
                aria-label="Buscar"
                className="nw-search-panel relative mx-auto mt-9 w-[min(26rem,calc(100%-2rem))] min-w-0 flex flex-col max-h-[min(28rem,calc(100vh-5rem))] rounded-xl border border-ink/12 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <label className="flex items-center gap-2.5 shrink-0 h-11 px-3 border-b border-ink/10">
                    <Search size={15} className="text-ink-mute shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Device, cena ou tela"
                        aria-label="Buscar"
                        className="min-w-0 flex-1 bg-transparent nw-body text-ink placeholder:text-ink-mute"
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                onClose();
                            }
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setIndex((i) => Math.min(filtered.length - 1, i + 1));
                            }
                            if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setIndex((i) => Math.max(0, i - 1));
                            }
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                run(filtered[index]);
                            }
                        }}
                    />
                </label>
                <ul className="nw-search-list min-h-0 flex-1 overflow-y-auto py-1">
                    {filtered.length === 0 && (
                        <li className="px-3 py-4 nw-body text-ink-mute">Nada encontrado</li>
                    )}
                    {filtered.map((action, i) => (
                        <li key={action.id}>
                            <button
                                type="button"
                                onMouseEnter={() => setIndex(i)}
                                onClick={() => run(action)}
                                className={`w-full h-9 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 text-left ${
                                    i === index ? 'bg-graphite-600 text-ink' : 'text-ink-dim hover:text-ink'
                                }`}
                            >
                                <span className="min-w-0 truncate nw-body">{action.label}</span>
                                {action.hint ? (
                                    <kbd className="shrink-0 nw-meta text-ink-mute">{action.hint}</kbd>
                                ) : (
                                    <span className="w-0" />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
