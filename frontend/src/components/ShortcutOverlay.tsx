import React from 'react';

export const ShortcutOverlay: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
    if (!open) return null;
    const rows = [
        ['1–6', 'Studio / Luz / Explorar / Efeitos / Biblioteca / Cenas'],
        ['Ctrl+K', 'Buscar (Redigitalizar)'],
        ['Ctrl+S', 'Salvar cena'],
        ['Esc', 'Fechar painel'],
        ['?', 'Atalhos'],
    ];
    return (
        <div className="fixed inset-0 z-[70] bg-black/55 flex items-center justify-center" onClick={onClose}>
            <div className="w-full max-w-sm bg-graphite-800 border border-ink/15 p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Atalhos">
                <p className="nw-kicker text-ink-mute mb-3">Teclado</p>
                <ul className="space-y-2">
                    {rows.map(([key, label]) => (
                        <li key={`${key}-${label}`} className="flex items-center justify-between gap-4">
                            <span className="nw-body text-ink-dim">{label}</span>
                            <kbd className="nw-meta text-ink px-1.5 py-0.5 border border-ink/15">{key}</kbd>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
