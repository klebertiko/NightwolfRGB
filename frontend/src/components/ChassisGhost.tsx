import React from 'react';
import type { DeviceData } from '../types';
import { kindLabel } from '../lib/device';

export const CHASSIS_SLOTS: { kind: string; x: string; y: string }[] = [
    { kind: 'Placa', x: '22%', y: '34%' },
    { kind: 'GPU', x: '62%', y: '24%' },
    { kind: 'DRAM', x: '62%', y: '46%' },
    { kind: 'Cooler', x: '18%', y: '70%' },
    { kind: 'Fita', x: '70%', y: '72%' },
    { kind: 'Teclado', x: '38%', y: '78%' },
    { kind: 'Mouse', x: '78%', y: '54%' },
    { kind: 'RGB', x: '44%', y: '14%' },
];

export function slotForDevice(device: DeviceData, used: Set<string>) {
    const kind = kindLabel(device);
    const preferred = CHASSIS_SLOTS.find((slot) => slot.kind === kind && !used.has(slot.kind));
    const fallback = CHASSIS_SLOTS.find((slot) => !used.has(slot.kind)) || CHASSIS_SLOTS[0];
    const slot = preferred || fallback;
    used.add(slot.kind);
    return slot;
}

export const ChassisGhost: React.FC<{ color: string; className?: string }> = ({ color, className = '' }) => (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true">
        <rect x="36" y="16" width="248" height="188" rx="18" fill="none" stroke="currentColor" strokeOpacity="0.28" />
        <rect x="52" y="32" width="132" height="84" rx="8" fill="none" stroke="currentColor" strokeOpacity="0.45" />
        <rect x="60" y="40" width="48" height="28" rx="4" fill={color} fillOpacity="0.35" />
        <rect x="116" y="40" width="56" height="12" rx="3" fill={color} fillOpacity="0.55" />
        <rect x="116" y="58" width="56" height="12" rx="3" fill={color} fillOpacity="0.35" />
        <rect x="116" y="76" width="56" height="12" rx="3" fill="none" stroke={color} strokeOpacity="0.5" />
        <rect x="196" y="32" width="72" height="32" rx="6" fill={color} fillOpacity="0.28" stroke={color} strokeOpacity="0.8" />
        <rect x="196" y="72" width="72" height="44" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.4" />
        <circle cx="76" cy="168" r="16" fill={color} fillOpacity="0.22" stroke={color} />
        <circle cx="116" cy="168" r="16" fill={color} fillOpacity="0.18" stroke={color} strokeOpacity="0.7" />
        <circle cx="156" cy="168" r="16" fill={color} fillOpacity="0.14" stroke="currentColor" strokeOpacity="0.45" />
        <circle cx="196" cy="168" r="16" fill={color} fillOpacity="0.22" stroke={color} />
        <rect x="228" y="152" width="40" height="32" rx="6" fill={color} fillOpacity="0.2" stroke={color} strokeOpacity="0.6" />
    </svg>
);
