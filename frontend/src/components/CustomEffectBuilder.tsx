import React, { useState } from 'react';
import { Plus, X, Play, Square, Palette } from 'lucide-react';

interface CustomEffectBuilderProps {
    startEffect: (type: string, options: any) => Promise<void>;
    stopEffect: () => Promise<void>;
    isActive: boolean;
}

export const CustomEffectBuilder: React.FC<CustomEffectBuilderProps> = ({
    startEffect,
    stopEffect,
    isActive
}) => {
    const [colors, setColors] = useState<string[]>(['#FF0000', '#0000FF']);
    const [speed, setSpeed] = useState(50);
    const [newColor, setNewColor] = useState('#00FF00');

    const handleAddColor = () => {
        setColors([...colors, newColor]);
    };

    const handleRemoveColor = (index: number) => {
        setColors(colors.filter((_, i) => i !== index));
    };

    const handleStart = () => {
        if (colors.length === 0) return;
        startEffect('custom', {
            colors,
            speed
        });
    };

    return (
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Palette size={16} /> Custom Sequence
            </h3>

            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {colors.map((color, index) => (
                        <div key={index} className="relative group">
                            <div
                                className="w-10 h-10 rounded-lg shadow-lg border border-white/20"
                                style={{ backgroundColor: color }}
                            />
                            <button
                                onClick={() => handleRemoveColor(index)}
                                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={newColor}
                            onChange={(e) => setNewColor(e.target.value)}
                            className="w-10 h-10 rounded-lg border-none cursor-pointer bg-transparent"
                        />
                        <button
                            onClick={handleAddColor}
                            className="w-10 h-10 rounded-lg border border-dashed border-white/30 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span>Speed</span>
                        <span>{speed}%</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="100"
                        value={speed}
                        onChange={(e) => {
                            const newSpeed = parseInt(e.target.value);
                            setSpeed(newSpeed);
                            if (isActive) {
                                startEffect('custom', { colors, speed: newSpeed });
                            }
                        }}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500"
                    />
                </div>

                <div>
                    {isActive ? (
                        <button
                            onClick={stopEffect}
                            className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 font-semibold border border-red-500/20 text-sm flex items-center justify-center gap-2"
                        >
                            <Square size={16} className="fill-current" />
                            Stop Sequence
                        </button>
                    ) : (
                        <button
                            onClick={handleStart}
                            disabled={colors.length < 2}
                            className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                        >
                            <Play size={16} className="fill-current" />
                            Play Sequence
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
