/**
 * Honest SDK surface. Nightwolf only claims what bundled OpenRGB protocol v5 exposes.
 * Do not present these as UI features.
 */
export const SDK_CAPABILITIES = {
    protocol: 5,
    pluginList: { packet: 200, sinceProtocol: 4 },
    pluginSpecific: { packet: 201, sinceProtocol: 4 },
    effectsPlugin: {
        packets: [0, 20, 41],
        canList: true,
        canStartStopByName: true,
        canSetSpeed: false,
        canSetAudio: false,
        canInstall: false,
    },
    impossible: [
        {
            id: 'plugin-store',
            reason: 'O SDK lista plugins já carregados no OpenRGB; não instala nem descarrega plugins.',
        },
        {
            id: 'effects-plugin-params',
            reason: 'O plugin Effects só lista / liga / desliga por nome. Velocidade, áudio e shaders ficam no OpenRGB.',
        },
        {
            id: 'app-autoupdate',
            reason: 'Não há instalador empacotado nem feed de versão do Nightwolf. Só o bundle OpenRGB atualiza in-app.',
        },
        {
            id: 'protocol-v6',
            reason: 'Settings manager, unique IDs e ACK são protocol v6. O OpenRGB empacotado fala v5.',
        },
        {
            id: 'mic-audio',
            reason: 'Captura de áudio não passa pelo SDK. Efeitos Nightwolf pintam Direct; barras de áudio seriam fake.',
        },
    ],
} as const;
