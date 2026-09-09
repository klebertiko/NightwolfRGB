import React from 'react';

interface StatusBarProps {
    deviceCount: number;
    selectedLabel: string;
    activeEffect: string | null;
    effectsError?: string | null;
    engineEnabled: boolean;
    sdkPort?: number;
    protocolVersion?: number | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
    deviceCount,
    selectedLabel,
    activeEffect,
    effectsError,
    engineEnabled,
    sdkPort = 6742,
    protocolVersion,
}) => {
    return (
        <footer className="h-8 shrink-0 flex items-center justify-between gap-3 px-3 border-t border-ink/10 bg-graphite-800 nw-meta text-ink-mute">
            <div className="flex items-center gap-3 min-w-0">
                <span className="truncate">
                    {deviceCount} {deviceCount === 1 ? 'device' : 'devices'}
                </span>
                <span className="text-ink/15" aria-hidden>
                    ·
                </span>
                <span className="truncate text-ink-dim">{selectedLabel}</span>
                <span className="text-ink/15" aria-hidden>
                    ·
                </span>
                <span className="shrink-0 tabular-nums">
                    OpenRGB :{sdkPort}
                    {protocolVersion != null ? ` · v${protocolVersion}` : ''}
                </span>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-ink-dim">
                {effectsError && <span className="text-red-400 max-w-[16rem] truncate">{effectsError}</span>}
                {!engineEnabled && <span>controle off</span>}
                {engineEnabled && activeEffect && !effectsError && (
                    <span>efeito · {activeEffect}</span>
                )}
            </div>
        </footer>
    );
};
