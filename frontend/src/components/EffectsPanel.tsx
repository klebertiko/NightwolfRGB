import React, { useState } from 'react';
import { Play, Square, Activity, Zap, Palette, Radio, Sliders } from 'lucide-react';
import { CustomEffectBuilder } from './CustomEffectBuilder';

interface EffectsPanelProps {
    activeEffect: string | null;
    startEffect: (type: string, options: any) => Promise<void>;
    stopEffect: () => Promise<void>;
    currentColor: string;
}

export const EffectsPanel: React.FC<EffectsPanelProps> = ({
    activeEffect,
    startEffect,
    stopEffect,
    currentColor
}) => {
    const [speed, setSpeed] = useState(50);
    const [selectedType, setSelectedType] = useState<string>('breathing');

    const handleStart = () => {
        startEffect(selectedType, {
            speed,
            color: currentColor
        });
    };

    const effects = [
        { id: 'static', name: 'Static', icon: <Square size={18} /> },
        { id: 'breathing', name: 'Breathing', icon: <Activity size={18} /> },
        { id: 'strobing', name: 'Strobing', icon: <Zap size={18} /> },
        { id: 'rainbow', name: 'Rainbow', icon: <Palette size={18} /> },
        { id: 'spectrum', name: 'Spectrum', icon: <Radio size={18} /> },
        { id: 'custom', name: 'Custom Builder', icon: <Sliders size={18} /> },
    ];

    return (
        <div className="card p-6 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-xl">
            {/* ... Header ... */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                    <Activity size={24} />
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    Effects Engine
                </h2>
                {activeEffect && (
                    <span className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20 animate-pulse">
                        ACTIVE: {activeEffect.toUpperCase()}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {effects.map((effect) => (
                    <button
                        key={effect.id}
                        onClick={() => setSelectedType(effect.id)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${selectedType === effect.id
                            ? 'bg-purple-600/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {effect.icon}
                        <span className="text-sm font-medium">{effect.name}</span>
                    </button>
                ))}
            </div>

            {selectedType === 'custom' ? (
                <CustomEffectBuilder
                    startEffect={startEffect}
                    stopEffect={stopEffect}
                    isActive={activeEffect === 'custom'}
                />
            ) : (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60 flex items-center gap-2">
                                <Sliders size={14} /> Speed
                            </span>
                            <span className="text-white font-mono">{speed}%</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={speed}
                            onChange={(e) => {
                                const newSpeed = parseInt(e.target.value);
                                setSpeed(newSpeed);
                                if (activeEffect && activeEffect === selectedType) {
                                    startEffect(selectedType, { speed: newSpeed, color: currentColor });
                                }
                            }}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                        />
                    </div>

                    <div className="flex gap-3">
                        {activeEffect === selectedType ? (
                            <button
                                onClick={stopEffect}
                                className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-500 font-semibold border border-red-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Square size={18} className="fill-current" />
                                Stop Effect
                            </button>
                        ) : (
                            <button
                                onClick={handleStart}
                                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Play size={18} className="fill-current" />
                                Start {selectedType}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Note logic ... */}
            <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-200/80">
                <strong>Note:</strong> Some effects (Rainbow, Spectrum) override manual color selection.
            </div>
        </div>
    );
};
