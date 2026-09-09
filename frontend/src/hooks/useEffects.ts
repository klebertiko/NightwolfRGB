import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

export const useEffects = (engineEnabled?: boolean) => {
    const [activeEffect, setActiveEffect] = useState<string | null>(null);
    const [effectOptions, setEffectOptions] = useState<Record<string, unknown>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastRef = useRef<{ type: string; options: Record<string, unknown> }>({
        type: 'breathing',
        options: { speed: 50 },
    });
    const busyRef = useRef(false);

    const fetchStatus = useCallback(async () => {
        if (busyRef.current) return;
        try {
            const response = await api.getEffectsStatus();
            if (response.data.active) {
                setActiveEffect(response.data.effect);
                setEffectOptions(response.data.options || {});
                lastRef.current = {
                    type: response.data.effect,
                    options: response.data.options || lastRef.current.options,
                };
            } else {
                setActiveEffect(null);
            }
        } catch (err) {
            console.error('Error fetching effects status:', err);
        }
    }, []);

    useEffect(() => {
        void fetchStatus();
        const interval = setInterval(() => { void fetchStatus(); }, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    useEffect(() => {
        if (engineEnabled === false) setActiveEffect(null);
    }, [engineEnabled]);

    const startEffect = useCallback(async (type: string, options: Record<string, unknown>) => {
        if (engineEnabled === false) return;
        busyRef.current = true;
        setLoading(true);
        setError(null);
        setActiveEffect(type);
        lastRef.current = { type, options };
        try {
            await api.startEffect(type, options);
            setEffectOptions(options);
        } catch (err: any) {
            setActiveEffect(null);
            if (err.response?.data?.code === 'ENGINE_OFF') {
                setError('Ligue o Controle para usar efeitos.');
            } else {
                setError(err.response?.data?.error || err.message);
            }
            console.error(`Error starting effect ${type}:`, err);
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    }, [engineEnabled]);

    const stopEffect = useCallback(async () => {
        busyRef.current = true;
        setLoading(true);
        setError(null);
        setActiveEffect(null);
        try {
            await api.stopEffect();
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
            console.error('Error stopping effect:', err);
            await fetchStatus();
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    }, [fetchStatus]);

    const toggleEffect = useCallback(async (fallbackOptions?: Record<string, unknown>) => {
        if (busyRef.current) return;
        if (engineEnabled === false) return;
        if (activeEffect) {
            await stopEffect();
            return;
        }
        await startEffect(lastRef.current.type, { ...lastRef.current.options, ...fallbackOptions });
    }, [activeEffect, startEffect, stopEffect, engineEnabled]);

    return {
        activeEffect,
        effectOptions,
        loading,
        error,
        startEffect,
        stopEffect,
        toggleEffect,
        refreshStatus: fetchStatus,
    };
};
