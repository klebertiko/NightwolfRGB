import React, { useEffect, useState } from 'react';
import { ShieldAlert, Trash2, AlertTriangle, CheckCircle, Loader, X } from 'lucide-react';
import { useCleanup } from '../hooks/useCleanup';
import type { CleanupDetection, FullCleanupResult } from '../types';

export const CleanupPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { detectConflicts, fullCleanup } = useCleanup();
    const [detection, setDetection] = useState<CleanupDetection | null>(null);
    const [cleanupResult, setCleanupResult] = useState<FullCleanupResult | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const handleDetect = async () => {
        setIsScanning(true);
        try {
            setDetection(await detectConflicts());
        } catch (error) {
            console.error('Detection failed:', error);
        }
        setIsScanning(false);
    };

    useEffect(() => {
        handleDetect();
    }, []);

    const handleCleanup = async () => {
        if (!window.confirm('Isto fecha iCUE, Armoury Crate, Synapse e outros RGB em conflito. Continuar?')) return;
        setIsScanning(true);
        try {
            setCleanupResult(await fullCleanup());
            setTimeout(handleDetect, 1000);
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
        setIsScanning(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
            <aside
                className="w-full max-w-md h-full bg-graphite-800 border-l border-ink/10 p-6 overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-labelledby="cleanup-title"
            >
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={20} className="text-red-400" />
                        <div>
                            <h2 id="cleanup-title" className="nw-display text-[22px] text-ink">RGB Cleanup</h2>
                            <p className="nw-body text-ink-mute mt-1">Catálogo de 63 processos conhecidos</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="text-ink-dim hover:text-ink" aria-label="Fechar">
                        <X size={16} />
                    </button>
                </div>

                <div className="border border-ink/10 rounded-sm p-4 mb-6 nw-body text-ink-dim space-y-2">
                    <p>Detecta e encerra processos que disputam o hardware.</p>
                    <p className="flex gap-2 text-ember-hot">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                        iCUE, Armoury Crate, Razer Synapse e afins serão finalizados.
                    </p>
                </div>

                {isScanning ? (
                    <div className="flex items-center gap-3 py-8 nw-body text-ink-dim">
                        <Loader size={18} className="animate-spin" />
                        A escanear…
                    </div>
                ) : detection ? (
                    <div className="mb-6 space-y-3">
                        <div className="flex justify-between nw-kicker text-ink-mute">
                            <span>Conflitos</span>
                            <span className={detection.detected ? 'text-red-400' : 'text-emerald-400'}>{detection.count || 0}</span>
                        </div>
                        {detection.detected && detection.processes ? (
                            <ul className="border border-red-500/20 rounded-sm p-3 max-h-40 overflow-y-auto space-y-1.5">
                                {detection.processes.map((process) => (
                                    <li key={process} className="nw-body text-ink-dim flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {process}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="flex items-center gap-2 nw-body text-emerald-400">
                                <CheckCircle size={16} /> Sistema limpo
                            </p>
                        )}
                    </div>
                ) : null}

                {cleanupResult && (
                    <div className="border border-ember/30 rounded-sm p-4 mb-6 nw-body">
                        <p className="font-medium text-ember mb-2">Limpeza concluída</p>
                        <p className="nw-meta text-ink-dim">
                            {cleanupResult.processKill?.killed || 0} processos finalizados
                        </p>
                    </div>
                )}

                <div className="flex gap-2">
                    <button type="button" onClick={handleDetect} disabled={isScanning} className="flex-1 min-h-10 py-2.5 nw-body border border-ink/15 rounded-sm text-ink-dim hover:text-ink">
                        Re-escanear
                    </button>
                    {detection?.detected && (
                        <button
                            type="button"
                            onClick={handleCleanup}
                            disabled={isScanning}
                            className="flex-1 min-h-10 py-2.5 nw-body bg-red-700 hover:bg-red-600 text-white rounded-sm flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} /> Executar
                        </button>
                    )}
                </div>
            </aside>
        </div>
    );
};
