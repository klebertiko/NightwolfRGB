import React, { useEffect, useState } from 'react';
import { Download, Loader, X } from 'lucide-react';
import { useUpdate } from '../hooks/useUpdate';

export const UpdatePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { status, loading, error, getStatus, updateOpenRgb } = useUpdate();
    const [openRgbBusy, setOpenRgbBusy] = useState(false);

    useEffect(() => {
        void getStatus();
    }, [getStatus]);

    const appAvailable = status?.appUpdate.available;
    const nextVersion = status?.appUpdate.version;
    const openRgbInstalled = status?.openRgb.installed;
    const openRgbTag = status?.openRgb.tag;

    const handleUpdateOpenRgb = async () => {
        if (!window.confirm('Atualizar o OpenRGB? O aplicativo precisará reiniciar o servidor de hardware.')) return;
        setOpenRgbBusy(true);
        try {
            await updateOpenRgb();
        } finally {
            setOpenRgbBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
            <aside
                className="w-full max-w-md h-full bg-graphite-800 border-l border-ink/10 p-6 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="update-title"
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Download size={20} className="text-ember" />
                        <div>
                            <h2 id="update-title" className="nw-display text-[22px] text-ink">Atualizações</h2>
                            <p className="nw-body text-ink-mute mt-1">Nightwolf + OpenRGB</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
                        <X size={16} />
                    </button>
                </div>

                {error && <p className="nw-body text-red-400 mb-4">{error}</p>}

                {/* Block 1 — App */}
                <section className="border border-ink/10 rounded-sm p-4 mb-4 space-y-3">
                    <h3 className="nw-body font-semibold text-ink">Nightwolf App</h3>
                    <p className="nw-meta text-ink-dim">Instalado: {status?.appVersion ?? '…'}</p>
                    {appAvailable && nextVersion ? (
                        <p className="nw-body text-ember">{nextVersion} disponível para download.</p>
                    ) : (
                        <p className="nw-body text-ink-mute">
                            Sem instalador empacotado. Nightwolf não baixa a si mesmo pela rede.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={() => void getStatus()}
                        disabled={loading || !appAvailable}
                        className="w-full min-h-10 py-2.5 nw-body font-medium bg-ember text-graphite-950 rounded-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                        {appAvailable ? `Baixar ${nextVersion}` : 'Nenhuma atualização'}
                    </button>
                </section>

                {/* Block 2 — OpenRGB */}
                <section className="border border-ink/10 rounded-sm p-4 space-y-3">
                    <h3 className="nw-body font-semibold text-ink">OpenRGB</h3>
                    <p className="nw-meta text-ink-dim">
                        {openRgbInstalled
                            ? `Instalado: ${openRgbTag ?? 'versão desconhecida'}`
                            : 'Não instalado'}
                    </p>
                    {openRgbTag && (
                        <p className="nw-meta text-ink-mute">Tag: {openRgbTag}</p>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleUpdateOpenRgb()}
                        disabled={openRgbBusy || loading}
                        className="w-full min-h-10 py-2.5 nw-body font-medium bg-graphite-700 border border-ink/20 text-ink rounded-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-graphite-600"
                    >
                        {openRgbBusy ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                        Atualizar OpenRGB
                    </button>
                </section>
            </aside>
        </div>
    );
};
