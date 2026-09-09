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

export const ChassisGhost: React.FC<{ color: string; fills?: Record<string, string>; className?: string }> = ({
    color,
    fills = {},
    className = '',
}) => {
    const c = (kind: string) => fills[kind] || color;
    const placa = c('Placa');
    const dram = c('DRAM');
    const gpu = c('GPU');
    const cooler = c('Cooler');
    const fita = c('Fita');
    return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true">
        <rect x="36" y="16" width="248" height="188" rx="18" fill="none" stroke="currentColor" strokeOpacity="0.28" />
        <rect x="52" y="32" width="132" height="84" rx="8" fill="none" stroke="currentColor" strokeOpacity="0.45" />
        <rect x="60" y="40" width="48" height="28" rx="4" fill={placa} fillOpacity="0.55" />
        <rect x="116" y="40" width="56" height="12" rx="3" fill={dram} fillOpacity="0.7" />
        <rect x="116" y="58" width="56" height="12" rx="3" fill={dram} fillOpacity="0.5" />
        <rect x="116" y="76" width="56" height="12" rx="3" fill={dram} fillOpacity="0.35" stroke={dram} strokeOpacity="0.5" />
        <rect x="196" y="32" width="72" height="32" rx="6" fill={gpu} fillOpacity="0.45" stroke={gpu} strokeOpacity="0.9" />
        <rect x="196" y="72" width="72" height="44" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.4" />
        <circle cx="76" cy="168" r="16" fill={cooler} fillOpacity="0.35" stroke={cooler} />
        <circle cx="116" cy="168" r="16" fill={cooler} fillOpacity="0.28" stroke={cooler} strokeOpacity="0.7" />
        <circle cx="156" cy="168" r="16" fill={fita} fillOpacity="0.22" stroke={fita} strokeOpacity="0.55" />
        <circle cx="196" cy="168" r="16" fill={cooler} fillOpacity="0.3" stroke={cooler} />
        <rect x="228" y="152" width="40" height="32" rx="6" fill={fita} fillOpacity="0.35" stroke={fita} strokeOpacity="0.7" />
    </svg>
    );
};
