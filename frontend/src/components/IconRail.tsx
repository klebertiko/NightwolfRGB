import React from 'react';
import { LayoutGrid, Lamp, Waves, Bookmark, ShieldAlert, Download } from 'lucide-react';

export type AppTab = 'dashboard' | 'lighting' | 'effects' | 'profiles';

interface IconRailProps {
    active: AppTab;
    onChange: (tab: AppTab) => void;
    onCleanup: () => void;
    onUpdate: () => void;
    conflictCount?: number;
}

const items: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Studio', icon: <LayoutGrid size={16} /> },
    { id: 'lighting', label: 'Luz', icon: <Lamp size={16} /> },
    { id: 'effects', label: 'Efeitos', icon: <Waves size={16} /> },
    { id: 'profiles', label: 'Cenas', icon: <Bookmark size={16} /> },
];

export const IconRail: React.FC<IconRailProps> = ({ active, onChange, onCleanup, onUpdate, conflictCount = 0 }) => {
    return (
        <nav className="w-[8.5rem] shrink-0 flex flex-col py-3 px-2 gap-0.5 bg-graphite-800" aria-label="Principal">
            {items.map((item) => {
                const on = active === item.id;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange(item.id)}
                        aria-current={on ? 'page' : undefined}
                        className={`flex items-center gap-2.5 min-h-11 px-2.5 rounded-xl nw-body ${
                            on ? 'bg-graphite-600 text-ink shadow-ember' : 'text-ink-dim hover:text-ink hover:bg-graphite-700'
                        }`}
                    >
                        <span className={on ? 'text-ember' : ''}>{item.icon}</span>
                        <span className="flex-1 text-left">{item.label}</span>
                    </button>
                );
            })}
            <div className="flex-1" />
            <button
                type="button"
                onClick={onUpdate}
                className="flex items-center gap-2.5 min-h-11 px-2.5 rounded-xl nw-body text-ink-dim hover:text-ink hover:bg-graphite-700"
            >
                <Download size={16} />
                Atualizar
            </button>
            <button
                type="button"
                onClick={onCleanup}
                className="relative flex items-center gap-2.5 min-h-11 px-2.5 rounded-xl nw-body text-ink-dim hover:text-red-400 hover:bg-red-950/40"
            >
                <ShieldAlert size={16} />
                Limpeza
                {conflictCount > 0 && (
                    <span className="nw-meta tabular-nums text-red-400">{conflictCount}</span>
                )}
            </button>
        </nav>
    );
};
