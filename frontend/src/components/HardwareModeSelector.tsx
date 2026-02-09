import React, { useState, useEffect } from 'react';
import { Cpu, AlertTriangle } from 'lucide-react';
import { useDevices } from '../hooks/useDevices';

export const HardwareModeSelector: React.FC = () => {
    const { devices, setMode, refresh } = useDevices();
    const [selectedDevice, setSelectedDevice] = useState<any>(null);

    useEffect(() => {
        if (devices.length > 0 && !selectedDevice) {
            setSelectedDevice(devices[0]);
        }
    }, [devices]);

    const handleModeChange = async (modeId: number) => {
        if (!selectedDevice) return;
        await setMode(selectedDevice.id, modeId);
        // Refresh to get updated state
        setTimeout(refresh, 500);
    };

    if (!devices.length) return null;

    return (
        <div className="card p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 shadow-xl mt-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                    <Cpu size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Hardware Persistence</h2>
                    <p className="text-xs text-zinc-500">Modes run on device memory (No software needed)</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                {devices.map((d: any) => (
                    <button
                        key={d.id}
                        onClick={() => setSelectedDevice(d)}
                        className={`px-4 py-2 rounded-lg border text-xs font-bold uppercase whitespace-nowrap transition-all ${selectedDevice?.id === d.id
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-transparent border-zinc-800 text-zinc-600 hover:border-zinc-700'
                            }`}
                    >
                        {d.name}
                    </button>
                ))}
            </div>

            {selectedDevice && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedDevice.modes.map((mode: any) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeChange(mode.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${selectedDevice.activeMode === mode.id
                                ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                                : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:bg-zinc-900'
                                }`}
                        >
                            <span className="text-xs font-bold block">{mode.name}</span>
                            <span className="text-[10px] opacity-60">ID: {mode.id}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-6 p-4 rounded-lg bg-orange-950/30 border border-orange-900/50 flex gap-3 text-orange-200/80 text-xs">
                <AlertTriangle size={16} className="shrink-0" />
                <p>
                    <strong>Stability Note:</strong> Hardware modes are saved to the device's onboard controller.
                    They will keep running even if you close Nightwolf or OpenRGB. Use this for maximum stability.
                </p>
            </div>
        </div>
    );
};
