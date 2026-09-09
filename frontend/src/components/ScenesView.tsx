import React, { useEffect, useState } from 'react';
import { HardDrive, Plus } from 'lucide-react';
import { rgbCss } from '../lib/device';
import type { Profile } from '../types';

interface NativeProfiles {
    profiles: string[];
    loading: boolean;
    saving: boolean;
    fetchProfiles: () => Promise<void>;
    save: (name: string) => Promise<void>;
    load: (name: string) => Promise<void>;
    remove: (name: string) => Promise<void>;
}

interface ScenesViewProps {
    profiles: Profile[];
    activeSceneId?: string | null;
    onApply: (id: string) => void;
    onDelete: (id: string) => void;
    onCreate: () => void;
    native?: NativeProfiles;
    onNativeLoaded?: () => void;
}

export const ScenesView: React.FC<ScenesViewProps> = ({
    profiles,
    activeSceneId,
    onApply,
    onDelete,
    onCreate,
    native,
    onNativeLoaded,
}) => {
    const [orpName, setOrpName] = useState('');
    const [showOrp, setShowOrp] = useState(false);

    useEffect(() => {
        void native?.fetchProfiles();
    }, [native?.fetchProfiles]);

    const saveNative = async () => {
        if (!native || !orpName.trim()) return;
        await native.save(orpName.trim());
        setOrpName('');
        setShowOrp(false);
    };

    return (
        <div className="h-full overflow-y-auto p-4 bg-graphite-950 space-y-6">
            <section>
                <p className="nw-kicker text-ink-mute mb-3">Cenas Nightwolf</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                    {profiles.map((profile) => {
                        const isActive = profile.id === activeSceneId;
                        return (
                            <article key={profile.id} className={`nw-tile p-3 flex flex-col ${isActive ? 'ring-1 ring-ember/60' : ''}`}>
                                <div className="flex h-20 gap-px mb-3 overflow-hidden rounded-xl">
                                    {(profile.devices || []).slice(0, 12).map((d, i) => (
                                        <span
                                            key={i}
                                            className="flex-1"
                                            style={{
                                                background: rgbCss(d.color, '#2a2622'),
                                            }}
                                        />
                                    ))}
                                </div>
                                <h2 className="nw-body font-medium truncate">{profile.name}</h2>
                                <p className="nw-body text-ink-mute truncate mb-3">{profile.description}</p>
                                {isActive && (
                                    <p className="nw-meta text-ember mb-1">Cena ativa</p>
                                )}
                                <div className="mt-auto flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onApply(profile.id)}
                                        className={`flex-1 min-h-9 py-1.5 nw-body font-semibold rounded-lg ${
                                            isActive
                                                ? 'bg-graphite-700 text-ink border border-ink/20 hover:bg-graphite-600'
                                                : 'bg-ember text-graphite-950'
                                        }`}
                                    >
                                        {isActive ? 'Desativar' : 'Ativar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(profile.id)}
                                        className="min-h-9 px-2.5 py-1.5 nw-body border border-ink/15 text-ink-dim rounded-lg"
                                        aria-label={`Apagar ${profile.name}`}
                                    >
                                        Apagar
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                    <button
                        type="button"
                        onClick={onCreate}
                        className="min-h-[8.5rem] border border-dashed border-ink/15 text-ink-mute hover:text-ember hover:border-ember/40 flex flex-col items-center justify-center gap-1 rounded-2xl"
                    >
                        <Plus size={16} />
                        <span className="nw-meta">Nova cena</span>
                    </button>
                </div>
            </section>

            {native && (
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <p className="nw-kicker text-ink-mute flex-1">Perfis OpenRGB</p>
                        <button
                            type="button"
                            onClick={() => setShowOrp((v) => !v)}
                            className="min-h-8 px-2.5 text-xs rounded-md border border-ink/15 text-ink-dim hover:text-ink"
                        >
                            Salvar perfil
                        </button>
                    </div>
                    {showOrp && (
                        <div className="flex gap-2 mb-3 max-w-sm">
                            <input
                                type="text"
                                value={orpName}
                                onChange={(e) => setOrpName(e.target.value)}
                                placeholder="Nome do .orp"
                                aria-label="Nome do perfil OpenRGB"
                                className="flex-1 min-h-9 bg-graphite-800 border border-ink/10 px-3 nw-body rounded-lg"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void saveNative();
                                }}
                            />
                            <button
                                type="button"
                                disabled={native.saving || !orpName.trim()}
                                onClick={() => void saveNative()}
                                className="min-h-9 px-3 nw-body font-semibold bg-ink text-graphite-950 rounded-lg disabled:opacity-40"
                            >
                                {native.saving ? '…' : 'Salvar'}
                            </button>
                        </div>
                    )}
                    {native.loading && native.profiles.length === 0 && (
                        <p className="nw-body text-ink-mute">A ler perfis nativos…</p>
                    )}
                    {!native.loading && native.profiles.length === 0 && (
                        <p className="nw-body text-ink-mute">Nenhum .orp no OpenRGB ainda.</p>
                    )}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
                        {native.profiles.map((name) => (
                            <article key={name} className="nw-tile p-3 flex flex-col">
                                <div className="flex items-center gap-2 mb-3 text-ink-mute">
                                    <HardDrive size={14} />
                                    <span className="nw-meta">.orp</span>
                                </div>
                                <h2 className="nw-body font-medium truncate mb-3">{name}</h2>
                                <div className="mt-auto flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            await native.load(name);
                                            onNativeLoaded?.();
                                        }}
                                        className="flex-1 min-h-9 py-1.5 nw-body font-semibold bg-ember text-graphite-950 rounded-lg"
                                    >
                                        Carregar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void native.remove(name)}
                                        className="min-h-9 px-2.5 py-1.5 nw-body border border-ink/15 text-ink-dim rounded-lg"
                                        aria-label={`Apagar perfil ${name}`}
                                    >
                                        Apagar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};
