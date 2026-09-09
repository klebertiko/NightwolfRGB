import React, { useState } from 'react';
import { Plus, X, Play, Square } from 'lucide-react';

interface CustomEffectBuilderProps {
    startEffect: (type: string, options: Record<string, unknown>) => Promise<void>;
    stopEffect: () => Promise<void>;
    isActive: boolean;
}

export const CustomEffectBuilder: React.FC<CustomEffectBuilderProps> = ({ startEffect, stopEffect, isActive }) => {
    const [colors, setColors] = useState<string[]>(['#ff4d8d', '#4d9fff']);
    const [speed, setSpeed] = useState(50);
    const [newColor, setNewColor] = useState('#6f9e6a');

    return (
        <div className="space-y-4 border border-ink/10 rounded-sm p-4">
            <p className="nw-kicker text-ink-mute">Sequência</p>
            <div className="flex flex-wrap gap-2">
                {colors.map((color, index) => (
                    <div key={`${color}-${index}`} className="relative">
                        <div className="w-9 h-9 rounded-sm border border-ink/15" style={{ backgroundColor: color }} />
                        <button
                            type="button"
                            aria-label="Remover cor"
                            onClick={() => setColors(colors.filter((_, i) => i !== index))}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-graphite-700 text-ink-dim flex items-center justify-center"
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-9 h-9 rounded-sm" aria-label="Nova cor" />
                <button
                    type="button"
                    onClick={() => setColors([...colors, newColor])}
                    className="w-9 h-9 rounded-sm border border-dashed border-ink/20 text-ink-dim flex items-center justify-center"
                    aria-label="Adicionar cor"
                >
                    <Plus size={14} />
                </button>
            </div>
            <div>
                <div className="flex justify-between nw-kicker text-ink-mute mb-2">
                    <span>Velocidade</span>
                    <span>{speed}%</span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={100}
                    value={speed}
                    onChange={(e) => {
                        const next = parseInt(e.target.value, 10);
                        setSpeed(next);
                        if (isActive) startEffect('custom', { colors, speed: next });
                    }}
                />
            </div>
            {isActive ? (
                <button type="button" onClick={stopEffect} className="w-full min-h-10 py-2 nw-body border border-red-500/40 text-red-400 rounded-sm flex items-center justify-center gap-2">
                    <Square size={14} className="fill-current" /> Parar sequência
                </button>
            ) : (
                <button
                    type="button"
                    disabled={colors.length < 2}
                    onClick={() => startEffect('custom', { colors, speed })}
                    className="w-full min-h-10 py-2 nw-body font-medium bg-ember text-graphite-950 rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                    <Play size={14} className="fill-current" /> Tocar sequência
                </button>
            )}
        </div>
    );
};
