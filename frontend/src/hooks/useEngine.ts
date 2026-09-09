import { useState, useEffect, useCallback } from 'react';
import { api, wsUrl } from '../api/client';
import type { EngineState } from '../types';

export const useEngine = () => {
    const [engine, setEngine] = useState<EngineState>({ enabled: true, activeSceneId: null });
    const [loading, setLoading] = useState(false);

    const fetchEngine = useCallback(async () => {
        try {
            const res = await api.getEngine();
            setEngine(res.data as EngineState);
        } catch (err) {
            console.error('Failed to fetch engine state:', err);
        }
    }, []);

    useEffect(() => {
        void fetchEngine();
        const interval = setInterval(() => { void fetchEngine(); }, 5000);
        return () => clearInterval(interval);
    }, [fetchEngine]);

    useEffect(() => {
        const ws = new WebSocket(wsUrl());
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'engine' && message.data) {
                    setEngine(message.data as EngineState);
                }
            } catch {
                /* ignore non-JSON */
            }
        };
        return () => ws.close();
    }, []);

    const setEngineEnabled = useCallback(async (enabled: boolean) => {
        setLoading(true);
        try {
            const res = await api.setEngine(enabled);
            setEngine(res.data as EngineState);
        } catch (err) {
            console.error('Failed to set engine state:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const applyEngineFromProfile = useCallback((engineState: EngineState) => {
        setEngine(engineState);
    }, []);

    return { engine, loading, setEngineEnabled, refresh: fetchEngine, applyEngineFromProfile };
};
