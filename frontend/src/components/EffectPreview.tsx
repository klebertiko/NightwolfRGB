import React, { useEffect, useRef } from 'react';

interface EffectPreviewProps {
    color: string;
    isLive: boolean;
    effect: string | null;
}

export type PreviewKind =
    | 'static'
    | 'breathing'
    | 'strobing'
    | 'rainbow'
    | 'spectrum'
    | 'canvas'
    | 'custom'
    | 'plugin'
    | 'empty';

/** Map selected effect id → distinct preview motion (UI only). */
export function previewKindFromEffect(effect: string | null): PreviewKind {
    if (!effect) return 'empty';
    if (effect.startsWith('plugin:')) return 'plugin';
    if (effect === 'canvas-wave') return 'canvas';
    if (
        effect === 'static' ||
        effect === 'breathing' ||
        effect === 'strobing' ||
        effect === 'rainbow' ||
        effect === 'spectrum' ||
        effect === 'custom'
    ) {
        return effect;
    }
    return 'plugin';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full.slice(0, 6), 16);
    if (Number.isNaN(n)) return { r: 255, g: 77, b: 141 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function hsvToRgb(h: number, s: number, v: number): string {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const mod = i % 6;
    const r = [v, q, p, p, t, v][mod];
    const g = [t, v, v, q, p, p][mod];
    const b = [p, p, t, v, v, q][mod];
    return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

/** UI-only preview — motion and shape follow the selected effect; intensity rises when live. */
export const EffectPreview: React.FC<EffectPreviewProps> = ({ color, isLive, effect }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const kind = previewKindFromEffect(effect);
    const intensity = isLive ? 1 : 0.55;

    useEffect(() => {
        if (kind === 'empty') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const { r, g, b } = hexToRgb(color);
        let animationId = 0;
        const w = canvas.width;
        const h = canvas.height;

        const paint = (now: number) => {
            ctx.clearRect(0, 0, w, h);
            ctx.globalAlpha = 1;

            switch (kind) {
                case 'static': {
                    ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + intensity * 0.45})`;
                    ctx.fillRect(0, h * 0.28, w, h * 0.44);
                    ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + intensity * 0.2})`;
                    ctx.fillRect(0, 0, w, h);
                    break;
                }
                case 'breathing': {
                    const pulse = (Math.sin(now / (isLive ? 420 : 700)) + 1) / 2;
                    const alpha = (0.2 + pulse * 0.55) * intensity;
                    const rad = Math.min(w, h) * (0.28 + pulse * 0.22);
                    const grd = ctx.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, rad);
                    grd.addColorStop(0, `rgba(255,247,230,${alpha})`);
                    grd.addColorStop(0.35, `rgba(${r},${g},${b},${alpha})`);
                    grd.addColorStop(1, 'rgba(12,11,10,0)');
                    ctx.fillStyle = grd;
                    ctx.fillRect(0, 0, w, h);
                    break;
                }
                case 'strobing': {
                    const on = Math.floor(now / (isLive ? 90 : 160)) % 2 === 0;
                    ctx.fillStyle = on
                        ? `rgba(${r},${g},${b},${0.85 * intensity})`
                        : `rgba(${r},${g},${b},${0.08})`;
                    ctx.fillRect(0, 0, w, h);
                    break;
                }
                case 'rainbow': {
                    const bars = 56;
                    const barW = w / bars;
                    const t = now / (isLive ? 280 : 480);
                    for (let i = 0; i < bars; i++) {
                        const hue = ((i / bars) + t * 0.08) % 1;
                        const wave = (Math.sin(t + (i / bars) * Math.PI * 2) + 1) / 2;
                        const bh = 10 + wave * h * (0.45 + intensity * 0.35);
                        ctx.fillStyle = hsvToRgb(hue, 0.85, 0.55 + intensity * 0.4);
                        ctx.globalAlpha = 0.55 + intensity * 0.35;
                        ctx.fillRect(i * barW + 1, h - bh, barW - 2, bh);
                    }
                    break;
                }
                case 'spectrum': {
                    const sweep = ((now / (isLive ? 2500 : 4000)) % 1) * w;
                    const grd = ctx.createLinearGradient(sweep - w, 0, sweep, 0);
                    for (let i = 0; i <= 6; i++) {
                        grd.addColorStop(i / 6, hsvToRgb(i / 6, 0.9, 0.5 + intensity * 0.45));
                    }
                    ctx.fillStyle = grd;
                    ctx.globalAlpha = 0.7 + intensity * 0.25;
                    ctx.fillRect(0, h * 0.2, w, h * 0.6);
                    break;
                }
                case 'canvas': {
                    const cols = 32;
                    const rows = 10;
                    const cw = w / cols;
                    const ch = h / rows;
                    const t = now / (isLive ? 380 : 620);
                    for (let y = 0; y < rows; y++) {
                        for (let x = 0; x < cols; x++) {
                            const wave = (Math.sin(t + x * 0.35 + y * 0.55) + 1) / 2;
                            ctx.fillStyle = `rgba(${r},${g},${b},${(0.12 + wave * 0.75) * intensity})`;
                            ctx.fillRect(x * cw + 1, y * ch + 1, cw - 2, ch - 2);
                        }
                    }
                    break;
                }
                case 'custom': {
                    const steps = 6;
                    const gap = 8;
                    const stepW = (w - gap * (steps + 1)) / steps;
                    const t = now / (isLive ? 500 : 800);
                    for (let i = 0; i < steps; i++) {
                        const active = Math.floor(t) % steps === i;
                        const base = 0.2 + ((i + 1) / steps) * 0.55;
                        ctx.fillStyle = `rgba(${r},${g},${b},${(active ? 0.95 : base) * intensity})`;
                        const sh = h * (0.35 + ((i + 1) / steps) * 0.45);
                        ctx.fillRect(gap + i * (stepW + gap), h - sh, stepW, sh);
                    }
                    break;
                }
                case 'plugin':
                default: {
                    const bars = 40;
                    const barW = w / bars;
                    const t = now / (isLive ? 300 : 500);
                    for (let i = 0; i < bars; i++) {
                        const n =
                            (Math.sin(t * 1.3 + i * 0.4) +
                                Math.sin(t * 0.7 + i * 0.9) +
                                2) /
                            4;
                        const bh = 8 + n * h * (0.5 + intensity * 0.35);
                        ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + intensity * 0.45})`;
                        ctx.fillRect(i * barW + 2, h - bh, barW - 4, bh);
                    }
                    break;
                }
            }
        };

        const loop = () => {
            paint(Date.now());
            animationId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationId);
    }, [kind, isLive, color, intensity]);

    return (
        <div
            className="h-full w-full bg-graphite-950/80 relative overflow-hidden"
            data-testid="effect-preview-canvas"
            data-preview-effect={effect ?? ''}
            data-preview-kind={kind}
        >
            {!effect && (
                <p className="absolute inset-0 flex items-center justify-center nw-meta text-ink-mute z-10">
                    Selecione um efeito
                </p>
            )}
            {effect && !isLive && (
                <p className="absolute top-2 left-2 nw-meta text-ink-mute z-10">Prévia · UI</p>
            )}
            {isLive && (
                <p className="absolute top-2 left-2 nw-meta text-ember z-10">Ao vivo</p>
            )}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" width={1000} height={200} />
        </div>
    );
};
