import React from 'react';

interface EffectSwitchProps {
    on: boolean;
    busy?: boolean;
    /** Visually disabled (separate from busy). Efeitos uses this when engine is off. */
    disabled?: boolean;
    onToggle: () => void;
    size?: 'sm' | 'md';
    /** Switch label shown next to the toggle. Defaults to "Efeitos". */
    label?: string;
    /**
     * `wash` follows the live RGB (effects). `power` is a fixed on-state so
     * Controle does not look like the selected color.
     */
    accent?: 'wash' | 'power';
}

export const EffectSwitch: React.FC<EffectSwitchProps> = ({
    on,
    busy = false,
    disabled = false,
    onToggle,
    size = 'md',
    label = 'Efeitos',
    accent = 'wash',
}) => {
    const compact = size === 'sm';
    const isDisabled = busy || disabled;
    const power = accent === 'power';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-busy={busy}
            aria-label={`${on ? 'Desligar' : 'Ligar'} ${label.toLowerCase()}`}
            disabled={isDisabled}
            onClick={onToggle}
            className={`app-no-drag inline-flex items-center gap-2 rounded-sm nw-body disabled:opacity-50 ${
                compact ? 'h-5' : 'min-h-10 w-full justify-between px-1'
            }`}
        >
            <span className={on ? 'text-ink' : 'text-ink-dim'}>{label}</span>
            <span
                aria-hidden
                className={`relative inline-flex shrink-0 rounded-full transition-colors ${
                    compact ? 'h-4 w-7' : 'h-5 w-9'
                } ${on ? (power ? 'bg-ink' : 'bg-ember') : 'bg-graphite-600'}`}
            >
                <span
                    className={`absolute top-0.5 rounded-full transition-transform ${
                        compact ? 'h-3 w-3' : 'h-4 w-4'
                    } ${on && power ? 'bg-graphite-950' : 'bg-ink'} ${
                        on ? (compact ? 'translate-x-3.5' : 'translate-x-4') : 'translate-x-0.5'
                    }`}
                />
            </span>
        </button>
    );
};
