import React from 'react';
import { Activity, AlertCircle, Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus = ({ connected, deviceCount }) => {
    return (
        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${connected
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
            {connected ? (
                <>
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse" />
                    <Wifi size={16} className="text-green-500" />
                    <span className="text-[10px] font-black text-green-500 uppercase tracking-[0.3em]">
                        OpenRGB Connected
                    </span>
                    <div className="ml-2 px-3 py-1 bg-green-500/20 rounded-lg">
                        <span className="text-[9px] font-mono font-bold text-green-400">
                            {deviceCount} Device{deviceCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </>
            ) : (
                <>
                    <AlertCircle size={16} className="text-red-500" />
                    <WifiOff size={16} className="text-red-500" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">
                        OpenRGB Disconnected
                    </span>
                </>
            )}
        </div>
    );
};
