/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                ink: {
                    DEFAULT: '#f3ead8',
                    dim: '#8a8172',
                    mute: '#5c564c',
                },
                graphite: {
                    950: '#080706',
                    900: '#0c0b0a',
                    800: '#141210',
                    700: '#1c1a17',
                    600: '#2a2622',
                    500: '#3a342e',
                },
                ember: {
                    DEFAULT: 'var(--live)',
                    hot: 'color-mix(in srgb, var(--live) 70%, white)',
                    dim: 'color-mix(in srgb, var(--live) 40%, black)',
                },
            },
            fontFamily: {
                display: ['Syne', 'sans-serif'],
                sans: ['IBM Plex Sans', 'sans-serif'],
                mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
            },
            boxShadow: {
                ember: '0 0 18px color-mix(in srgb, var(--live) 20%, transparent)',
            },
        },
    },
    plugins: [],
};
