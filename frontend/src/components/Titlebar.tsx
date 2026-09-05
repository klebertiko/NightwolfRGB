import React from 'react';
import { Minus, Square, X, Search } from 'lucide-react';
import { BrandMark } from './BrandMark';
import { EffectSwitch } from './EffectSwitch';

interface TitlebarProps {
    connected: boolean;
    onSearch: () => void;
    engineEnabled: boolean;
    engineBusy?: boolean;
    onToggleEngine: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
    connected,
    onSearch,
    engineEnabled,
    engineBusy,
    onToggleEngine,
}) => {
    const desktop = typeof window !== 'undefined' ? (window as any).nightwolf : undefined;
    const isMac = desktop?.platform === 'darwin';

    return (
        <header className="app-drag h-11 shrink-0 overflow-visible flex items-center justify-between px-2 border-b border-ink/10 bg-graphite-800 select-none">
            <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: isMac ? 68 : 4 }}>
                <BrandMark />
                <span className="nw-display text-[15px] text-ink">Nightwolf</span>
                <span className="nw-meta text-ink-mute">RGB</span>
            </div>
            <div className="flex items-center gap-3">
                {/* Master engine toggle — app-no-drag on the button itself to prevent Electron swallowing the click */}
                <span className="app-no-drag">
                    <EffectSwitch
                        on={engineEnabled}
                        busy={engineBusy}
                        onToggle={onToggleEngine}
                        size="sm"
                        label="Controle"
                        accent="power"
                    />
                </span>
                <button
                    type="button"
                    onClick={onSearch}
                    className="app-no-drag flex items-center gap-2 h-7 w-40 min-w-0 px-2 bg-graphite-950 border border-ink/10 text-ink-mute hover:text-ink hover:border-ink/20"
                    aria-label="Buscar comando, device ou cena"
                >
                    <Search size={13} strokeWidth={2} className="shrink-0" />
                    <span className="nw-body min-w-0 truncate text-left">Buscar</span>
                </button>
                <span
                    className="app-no-drag flex items-center gap-1.5 nw-meta text-ink-dim"
                    title={connected ? 'OpenRGB SDK no ar' : 'OpenRGB SDK offline'}
                >
                    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-ink-dim' : 'bg-red-500'}`} />
                    {connected ? 'SDK' : 'SDK offline'}
                </span>
                {!isMac && (
                    <div className="app-no-drag flex items-center">
                        <button type="button" className="p-1.5 text-ink-dim hover:text-ink" onClick={() => desktop?.window.minimize()} aria-label="Minimizar">
                            <Minus size={12} />
                        </button>
                        <button type="button" className="p-1.5 text-ink-dim hover:text-ink" onClick={() => desktop?.window.maximize()} aria-label="Maximizar">
                            <Square size={11} />
                        </button>
                        <button type="button" className="p-1.5 text-ink-dim hover:text-red-400" onClick={() => desktop?.window.close()} aria-label="Fechar">
                            <X size={12} />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
