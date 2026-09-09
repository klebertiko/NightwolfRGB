/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

interface NightwolfDesktop {
    platform: string;
    window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
    };
}

declare global {
    interface Window {
        nightwolf?: NightwolfDesktop;
    }
}

export {};
