import { useState, useCallback } from 'react';
import { api } from '../api/client';

export const useCleanup = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getStatus = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getCleanupStatus();
            setStatus(response.data);
            return response.data;
        } catch (err: any) {
            setError(err.message);
            console.error('Error getting cleanup status:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const detectConflicts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.detectCleanup();
            return response.data;
        } catch (err: any) {
            setError(err.message);
            console.error('Error detecting conflicts:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const killProcesses = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.killCleanupProcesses();
            return response.data;
        } catch (err: any) {
            setError(err.message);
            console.error('Error killing processes:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const fullCleanup = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.fullCleanup();
            await getStatus();
            return response.data;
        } catch (err: any) {
            setError(err.message);
            console.error('Error performing cleanup:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getStatus]);

    return {
        status,
        loading,
        error,
        getStatus,
        detectConflicts,
        killProcesses,
        fullCleanup
    };
};
