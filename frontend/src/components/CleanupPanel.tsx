import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { useCleanup } from '../hooks/useCleanup';

export const CleanupPanel = ({ onClose }) => {
    const { status, loading, detectConflicts, fullCleanup } = useCleanup();
    const [detection, setDetection] = useState(null);
    const [cleanupResult, setCleanupResult] = useState(null);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        handleDetect();
    }, []);

    const handleDetect = async () => {
        setIsScanning(true);
        try {
            const result = await detectConflicts();
            setDetection(result);
        } catch (error) {
            console.error('Detection failed:', error);
        }
        setIsScanning(false);
    };

    const handleCleanup = async () => {
        if (!window.confirm('⚠️  Isso irá fechar todos os softwares RGB concorrentes (iCUE, Armoury Crate, etc). Continuar?')) {
            return;
        }

        setIsScanning(true);
        try {
            const result = await fullCleanup();
            setCleanupResult(result);
            setTimeout(handleDetect, 1000); // Re-scan after cleanup
        } catch (error) {
            console.error('Cleanup failed:', error);
        }
        setIsScanning(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-zinc-950 border-2 border-red-500/30 rounded-3xl p-12 max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.3)]" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-red-500/10 rounded-2xl">
                        <ShieldAlert size={32} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black uppercase tracking-tighter italic text-white">RGB Cleanup</h2>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Sistema de Limpeza Avançado</p>
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-8">
                    <p className="text-zinc-400 text-sm leading-relaxed mb-4">
                        Esta ferramenta detecta e encerra softwares RGB concorrentes que podem interferir no controle do OpenRGB.
                    </p>
                    <div className="flex items-start gap-3 text-yellow-500/80 text-xs">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <p className="font-bold uppercase tracking-wider">
                            Processos como iCUE, Armoury Crate, Razer Synapse serão finalizados.
                        </p>
                    </div>
                </div>

                {/* Detection Results */}
                {isScanning ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader size={40} className="text-blue-500 animate-spin" />
                        <span className="ml-4 text-zinc-500 font-black uppercase tracking-widest">Escaneando...</span>
                    </div>
                ) : detection ? (
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-600">Processos Detectados</h3>
                            <span className={`px-4 py-2 rounded-xl font-mono font-bold text-sm ${detection.detected
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-green-500/20 text-green-400'
                                }`}>
                                {detection.count || 0} Conflito{detection.count !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {detection.detected && detection.processes && (
                            <div className="bg-zinc-900/40 border border-red-500/20 rounded-2xl p-4 max-h-48 overflow-y-auto">
                                <div className="space-y-2">
                                    {detection.processes.map((process, idx) => (
                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            <span className="text-zinc-400 font-mono">{process}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!detection.detected && (
                            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                                <CheckCircle size={24} className="text-green-500" />
                                <p className="text-green-400 font-bold uppercase tracking-wider text-sm">
                                    Sistema Limpo - Nenhum conflito detectado
                                </p>
                            </div>
                        )}
                    </div>
                ) : null}

                {/* Cleanup Result */}
                {cleanupResult && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 mb-8">
                        <div className="flex items-center gap-3 mb-3">
                            <CheckCircle size={20} className="text-blue-500" />
                            <h4 className="font-black uppercase tracking-widest text-blue-400 text-sm">Limpeza Concluída</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Processos Finalizados</p>
                                <p className="text-2xl font-mono font-bold text-white">{cleanupResult.processKill?.killed || 0}</p>
                            </div>
                            <div>
                                <p className="text-zinc-600 text-xs uppercase tracking-wider mb-1">Detectados</p>
                                <p className="text-2xl font-mono font-bold text-white">{cleanupResult.detection?.count || 0}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl transition-all font-black text-xs uppercase tracking-widest"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleDetect}
                        disabled={isScanning}
                        className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <ShieldAlert size={16} />
                        Re-Escanear
                    </button>
                    {detection?.detected && (
                        <button
                            onClick={handleCleanup}
                            disabled={isScanning}
                            className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.4)]"
                        >
                            <Trash2 size={16} />
                            Executar Limpeza
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
