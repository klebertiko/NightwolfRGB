import React from 'react';

interface ConnectionStatusProps {
    connected: boolean;
    deviceCount: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, deviceCount }) => {
    return (
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-sm nw-meta ${
            connected ? 'text-ink-dim' : 'text-red-400'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-ink-dim' : 'bg-red-500'}`} />
            {connected ? `SDK · ${deviceCount}` : 'SDK offline'}
        </div>
    );
};
