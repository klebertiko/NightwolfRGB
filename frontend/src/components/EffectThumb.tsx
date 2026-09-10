import React, { useId } from 'react';

export type ThumbKind =
    | 'static'
    | 'breathing'
    | 'strobing'
    | 'rainbow'
    | 'spectrum'
    | 'canvas'
    | 'custom'
    | 'plugin';

export type ThumbVariant = 'card' | 'spotlight' | 'row';

const KIND_CLASS: Record<ThumbKind, string> = {
    static: 'nw-thumb-static',
    breathing: 'nw-thumb-breathing',
    strobing: 'nw-thumb-strobing',
    rainbow: 'nw-thumb-rainbow',
    spectrum: 'nw-thumb-spectrum',
    canvas: 'nw-thumb-canvas',
    custom: 'nw-thumb-custom',
    plugin: 'nw-thumb-plugin',
};

interface EffectThumbProps {
    kind: ThumbKind;
    color?: string;
    live?: boolean;
    /** Spotlight = denser cinematic key-art for Discover heroes. */
    variant?: ThumbVariant;
    className?: string;
}

/** Full-bleed cinematic lighting scene — atmospheric key-art, not schematic glyphs. */
export const EffectThumb: React.FC<EffectThumbProps> = ({
    kind,
    color = '#ff4d8d',
    live = false,
    variant = 'card',
    className = '',
}) => {
    const uid = useId().replace(/:/g, '');
    const hero = variant === 'spotlight';
    const row = variant === 'row';
    const g = (name: string) => `${name}-${uid}`;

    return (
        <div
            className={`nw-thumb ${KIND_CLASS[kind]} ${live ? 'nw-thumb-live' : ''} ${
                hero ? 'nw-thumb-spotlight' : ''
            } ${row ? 'nw-thumb-row' : ''} ${className}`}
            style={{ ['--thumb-color' as string]: color }}
            data-thumb-kind={kind}
            data-thumb-pattern="representational"
            data-thumb-cinematic="full-bleed"
            data-thumb-variant={variant}
            aria-hidden
        >
            {kind === 'static' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <radialGradient id={g('heat')} cx="50%" cy="78%" r="70%">
                            <stop offset="0%" stopColor="#fff7e6" stopOpacity="0.95" />
                            <stop offset="18%" stopColor="var(--thumb-color)" stopOpacity="0.9" />
                            <stop offset="45%" stopColor="#ff6a1a" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#050302" stopOpacity="1" />
                        </radialGradient>
                        <linearGradient id={g('floor')} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#000" stopOpacity="0" />
                            <stop offset="100%" stopColor="#1a0802" stopOpacity="0.9" />
                        </linearGradient>
                    </defs>
                    <rect width="480" height="270" fill="#060403" />
                    <ellipse cx="240" cy="250" rx="220" ry="90" fill={`url(#${g('heat')})`} />
                    <ellipse className="nw-thumb-heat-core" cx="240" cy="210" rx="70" ry="36" fill="#ffb020" opacity="0.55" />
                    <ellipse cx="160" cy="200" rx="50" ry="28" fill="#ff4d00" opacity="0.35" />
                    <ellipse cx="320" cy="205" rx="55" ry="30" fill="#ff7a20" opacity="0.3" />
                    {[
                        [90, 160, 28],
                        [140, 130, 18],
                        [200, 145, 22],
                        [260, 120, 16],
                        [310, 150, 24],
                        [370, 135, 20],
                        [420, 165, 26],
                    ].map(([cx, cy, r], i) => (
                        <ellipse
                            key={i}
                            className="nw-thumb-ember"
                            cx={cx}
                            cy={cy}
                            rx={r}
                            ry={r * 0.55}
                            fill={i % 2 ? '#ffb020' : 'var(--thumb-color)'}
                            opacity={0.22 + (i % 3) * 0.08}
                        />
                    ))}
                    <rect width="480" height="270" fill={`url(#${g('floor')})`} />
                </svg>
            )}

            {kind === 'breathing' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <radialGradient id={g('plasma')} cx="48%" cy="52%" r="55%">
                            <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
                            <stop offset="22%" stopColor="var(--thumb-color)" stopOpacity="0.95" />
                            <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#05040a" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id={g('plasma2')} cx="70%" cy="40%" r="40%">
                            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#05040a" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <rect width="480" height="270" fill="#06050c" />
                    <ellipse cx="120" cy="200" rx="160" ry="90" fill="#1a1040" opacity="0.6" />
                    <ellipse className="nw-thumb-blob" cx="230" cy="140" rx="160" ry="100" fill={`url(#${g('plasma')})`} />
                    <ellipse className="nw-thumb-blob-core" cx="250" cy="120" rx="70" ry="48" fill="var(--thumb-color)" opacity="0.75" />
                    <ellipse className="nw-thumb-blob" cx="340" cy="100" rx="100" ry="70" fill={`url(#${g('plasma2')})`} />
                    <ellipse cx="220" cy="110" rx="28" ry="16" fill="#fff" opacity="0.35" />
                    <ellipse cx="300" cy="160" rx="90" ry="50" fill="#c084fc" opacity="0.18" />
                </svg>
            )}

            {kind === 'strobing' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1a2238" />
                            <stop offset="55%" stopColor="#0a0c14" />
                            <stop offset="100%" stopColor="#040406" />
                        </linearGradient>
                        <radialGradient id={g('flash')} cx="58%" cy="28%" r="35%">
                            <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
                            <stop offset="35%" stopColor="#a5b4fc" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#040406" stopOpacity="0" />
                        </radialGradient>
                        <filter id={g('glow')}>
                            <feGaussianBlur stdDeviation="2.5" result="b" />
                            <feMerge>
                                <feMergeNode in="b" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <rect width="480" height="270" fill={`url(#${g('sky')})`} />
                    <ellipse cx="100" cy="60" rx="140" ry="50" fill="#2a3348" opacity="0.55" />
                    <ellipse cx="320" cy="40" rx="160" ry="55" fill="#1e2740" opacity="0.7" />
                    <ellipse cx="280" cy="70" rx="100" ry="40" fill={`url(#${g('flash')})`} />
                    <path
                        className="nw-thumb-lightning"
                        d="M250 20 L235 95 L270 95 L230 200 L255 115 L220 115 Z"
                        fill="#eef2ff"
                        filter={`url(#${g('glow')})`}
                    />
                    <path
                        className="nw-thumb-lightning-branch"
                        d="M235 95 L190 130 L210 128 L175 175"
                        fill="none"
                        stroke="#c7d2fe"
                        strokeWidth="3"
                        strokeLinecap="round"
                        opacity="0.75"
                    />
                    <path
                        d="M270 95 L310 140 L295 138 L330 190"
                        fill="none"
                        stroke="#818cf8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        opacity="0.55"
                    />
                    <rect x="0" y="200" width="480" height="70" fill="#020203" opacity="0.55" />
                    <ellipse cx="240" cy="250" rx="200" ry="30" fill="#0f172a" opacity="0.4" />
                </svg>
            )}

            {kind === 'rainbow' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <radialGradient id={g('neb')} cx="40%" cy="45%" r="65%">
                            <stop offset="0%" stopColor="#fce7f3" stopOpacity="0.55" />
                            <stop offset="25%" stopColor="#c084fc" stopOpacity="0.7" />
                            <stop offset="55%" stopColor="#4c1d95" stopOpacity="0.85" />
                            <stop offset="100%" stopColor="#05030c" stopOpacity="1" />
                        </radialGradient>
                        <radialGradient id={g('neb2')} cx="75%" cy="60%" r="45%">
                            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.65" />
                            <stop offset="50%" stopColor="#2563eb" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#05030c" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id={g('neb3')} cx="20%" cy="70%" r="40%">
                            <stop offset="0%" stopColor="#ff4d8d" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#05030c" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <rect width="480" height="270" fill={`url(#${g('neb')})`} />
                    <ellipse className="nw-thumb-nebula" cx="360" cy="160" rx="150" ry="100" fill={`url(#${g('neb2')})`} />
                    <ellipse className="nw-thumb-nebula" cx="100" cy="190" rx="120" ry="80" fill={`url(#${g('neb3')})`} />
                    <ellipse cx="220" cy="100" rx="80" ry="40" fill="#f0abfc" opacity="0.25" />
                    {[
                        [40, 40],
                        [90, 80],
                        [150, 30],
                        [200, 70],
                        [280, 25],
                        [340, 55],
                        [400, 35],
                        [440, 90],
                        [60, 140],
                        [420, 180],
                        [300, 200],
                        [180, 220],
                    ].map(([cx, cy], i) => (
                        <circle
                            key={i}
                            className="nw-thumb-star"
                            cx={cx}
                            cy={cy}
                            r={i % 3 === 0 ? 1.8 : 1.1}
                            fill="#fff"
                            opacity={0.55 + (i % 4) * 0.1}
                        />
                    ))}
                </svg>
            )}

            {kind === 'spectrum' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id={g('aurora')} x1="0" y1="0" x2="1" y2="0.3">
                            <stop offset="0%" stopColor="#ff4d8d" stopOpacity="0.15" />
                            <stop offset="25%" stopColor="#a3e635" stopOpacity="0.55" />
                            <stop offset="50%" stopColor="#5eead4" stopOpacity="0.7" />
                            <stop offset="75%" stopColor="#818cf8" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#c084fc" stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id={g('horizon')} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#020617" />
                            <stop offset="60%" stopColor="#0c1929" />
                            <stop offset="100%" stopColor="#020617" />
                        </linearGradient>
                    </defs>
                    <rect width="480" height="270" fill={`url(#${g('horizon')})`} />
                    <path
                        className="nw-thumb-aurora"
                        d="M0 160 C80 40 160 200 240 70 C320 10 400 150 480 50 L480 270 L0 270 Z"
                        fill={`url(#${g('aurora')})`}
                        opacity="0.85"
                    />
                    <path
                        d="M0 180 C100 100 200 210 300 90 C380 40 440 140 480 100 L480 270 L0 270 Z"
                        fill="#5eead4"
                        opacity="0.12"
                    />
                    <ellipse cx="240" cy="250" rx="240" ry="40" fill="#000" opacity="0.45" />
                </svg>
            )}

            {kind === 'canvas' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id={g('ocean')} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
                            <stop offset="40%" stopColor="#0369a1" stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="1" />
                        </linearGradient>
                        <linearGradient id={g('caustic')} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#5eead4" stopOpacity="0" />
                            <stop offset="40%" stopColor="#67e8f9" stopOpacity="0.7" />
                            <stop offset="70%" stopColor="#818cf8" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#ff4d8d" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <rect width="480" height="270" fill="#020617" />
                    <rect width="480" height="270" fill={`url(#${g('ocean')})`} />
                    <path
                        className="nw-thumb-wave-band"
                        d="M0 120 Q60 70 120 120 T240 120 T360 120 T480 120 L480 270 L0 270 Z"
                        fill="#0c4a6e"
                        opacity="0.55"
                    />
                    <path
                        className="nw-thumb-wave-band"
                        d="M0 150 Q80 100 160 150 T320 150 T480 150"
                        fill="none"
                        stroke={`url(#${g('caustic')})`}
                        strokeWidth="4"
                        opacity="0.9"
                    />
                    <path
                        d="M0 175 Q90 130 180 175 T360 175 T480 175"
                        fill="none"
                        stroke="#67e8f9"
                        strokeWidth="2"
                        opacity="0.4"
                    />
                    <ellipse cx="240" cy="80" rx="120" ry="30" fill="#38bdf8" opacity="0.15" />
                </svg>
            )}

            {kind === 'custom' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id={g('fire')} x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#450a0a" />
                            <stop offset="40%" stopColor="#ea580c" />
                            <stop offset="70%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#fff7ed" stopOpacity="0.9" />
                        </linearGradient>
                        <radialGradient id={g('smoke')} cx="50%" cy="20%" r="60%">
                            <stop offset="0%" stopColor="#1c1917" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#050403" stopOpacity="1" />
                        </radialGradient>
                    </defs>
                    <rect width="480" height="270" fill={`url(#${g('smoke')})`} />
                    <path
                        className="nw-thumb-flame"
                        d="M80 270 C100 200 60 160 110 100 C140 150 130 80 170 40 C190 110 210 90 230 140 C250 70 280 120 300 50 C330 130 340 100 370 160 C400 90 430 150 440 270 Z"
                        fill={`url(#${g('fire')})`}
                        opacity="0.9"
                    />
                    <ellipse cx="240" cy="250" rx="180" ry="40" fill="#7c2d12" opacity="0.5" />
                    <ellipse className="nw-thumb-heat-core" cx="240" cy="200" rx="50" ry="30" fill="#fff7ed" opacity="0.45" />
                </svg>
            )}

            {kind === 'plugin' && (
                <svg className="nw-thumb-svg" viewBox="0 0 480 270" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <radialGradient id={g('void')} cx="55%" cy="40%" r="70%">
                            <stop offset="0%" stopColor="#312e81" stopOpacity="0.9" />
                            <stop offset="45%" stopColor="#1e1b4b" stopOpacity="0.95" />
                            <stop offset="100%" stopColor="#030712" stopOpacity="1" />
                        </radialGradient>
                        <radialGradient id={g('bloom')} cx="70%" cy="35%" r="35%">
                            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.55" />
                            <stop offset="100%" stopColor="#030712" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                    <rect width="480" height="270" fill={`url(#${g('void')})`} />
                    <ellipse cx="340" cy="90" rx="120" ry="80" fill={`url(#${g('bloom')})`} />
                    <ellipse cx="140" cy="180" rx="100" ry="60" fill="#ff4d8d" opacity="0.12" />
                    {[
                        [48, 40, 1.5],
                        [90, 95, 1.2],
                        [140, 32, 2],
                        [180, 110, 1.4],
                        [230, 55, 1.8],
                        [270, 120, 1.1],
                        [70, 160, 1.3],
                        [320, 40, 1.6],
                        [380, 80, 1.2],
                        [420, 50, 1.9],
                        [400, 160, 1.3],
                        [300, 200, 1.5],
                        [160, 200, 1.1],
                        [50, 220, 1.4],
                        [440, 210, 1.7],
                    ].map(([cx, cy, r], i) => (
                        <circle
                            key={i}
                            className={`nw-thumb-particle nw-thumb-p-${i % 4}`}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="#fff"
                            opacity={0.55 + (i % 3) * 0.12}
                        />
                    ))}
                </svg>
            )}
        </div>
    );
};
