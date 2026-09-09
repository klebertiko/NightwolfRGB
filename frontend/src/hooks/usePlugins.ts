import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { OpenRgbPlugin, PluginEffectsResponse } from '../types';

export const usePlugins = () => {
    const [plugins, setPlugins] = useState<OpenRgbPlugin[]>([]);
    const [pluginEffects, setPluginEffects] = useState<PluginEffectsResponse | null>(null);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const fx = await api.getPluginEffects();
            const data = fx.data as PluginEffectsResponse;
            setPluginEffects(data);
            setPlugins(data.plugins?.length ? data.plugins : (data.plugin ? [data.plugin] : []));
        } catch {
            setPlugins([]);
            setPluginEffects(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const startPluginEffect = useCallback(async (name: string) => {
        await api.startPluginEffect(name);
        await refresh();
    }, [refresh]);

    const stopPluginEffect = useCallback(async (name: string) => {
        await api.stopPluginEffect(name);
        await refresh();
    }, [refresh]);

    return {
        plugins,
        pluginEffects,
        loading,
        refresh,
        startPluginEffect,
        stopPluginEffect,
    };
};
