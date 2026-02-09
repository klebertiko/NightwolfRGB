import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useEffects = () => {
    const [activeEffect, setActiveEffect] = useState<string | null>(null);
    const [effectOptions, setEffectOptions] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/effects/status`);
            if (response.data.active) {
                setActiveEffect(response.data.effect);
                setEffectOptions(response.data.options || {});
            } else {
                setActiveEffect(null);
            }
        } catch (err: any) {
            console.error('Error fetching effects status:', err);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        // Poll status every 5 seconds to stay in sync
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const startEffect = async (type: string, options: any) => {
        setLoading(true);
        setError(null);
        try {
            await axios.post(`${API_URL}/effects/start`, { type, options });
            setActiveEffect(type);
            setEffectOptions(options);
        } catch (err: any) {
            setError(err.response?.data?.error || err.message);
            console.error(`Error starting effect ${type}:`, err);
        } finally {
            setLoading(false);
        }
    };

    const stopEffect = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/effects/stop`);
            setActiveEffect(null);
        } catch (err: any) {
            console.error('Error stopping effect:', err);
        } finally {
            setLoading(false);
        }
    };

    return {
        activeEffect,
        effectOptions,
        loading,
        error,
        startEffect,
        stopEffect,
        refreshStatus: fetchStatus
    };
};
