import { useState, useCallback } from 'react';
import { api } from '../api/client';

/**
 * Hook for native OpenRGB profiles (.orp files).
 *
 * These are the profiles that OpenRGB saves to its data directory.
 * They are different from Nightwolf's internal "scenes" (which live
 * in Nightwolf's own profiles.json).
 */
export const useNativeProfiles = () => {
    const [profiles, setProfiles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.getNativeProfiles();
            setProfiles(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            setError(err.message ?? 'Erro ao buscar perfis');
            console.error('Error fetching native profiles:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const save = useCallback(async (name: string) => {
        try {
            setSaving(true);
            await api.saveNativeProfile(name);
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message ?? 'Erro ao salvar perfil');
            throw err;
        } finally {
            setSaving(false);
        }
    }, [fetchProfiles]);

    const load = useCallback(async (name: string) => {
        try {
            await api.loadNativeProfile(name);
        } catch (err: any) {
            setError(err.message ?? 'Erro ao carregar perfil');
            throw err;
        }
    }, []);

    const remove = useCallback(async (name: string) => {
        try {
            await api.deleteNativeProfile(name);
            await fetchProfiles();
        } catch (err: any) {
            setError(err.message ?? 'Erro ao deletar perfil');
            throw err;
        }
    }, [fetchProfiles]);

    return {
        profiles,
        loading,
        saving,
        error,
        fetchProfiles,
        save,
        load,
        remove,
    };
};
