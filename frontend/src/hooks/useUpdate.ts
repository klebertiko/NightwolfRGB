import { useCallback, useState } from 'react';
import { api } from '../api/client';
import type { UpdateStatus } from '../types';

export const useUpdate = () => {
    const [status, setStatus] = useState<UpdateStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.getUpdateStatus();
            setStatus(response.data);
            return response.data as UpdateStatus;
        } catch (err: any) {
            const message = err.response?.data?.error || err.message;
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const updateOpenRgb = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.updateOpenRgb();
            await getStatus();
            return response.data;
        } catch (err: any) {
            const message = err.response?.data?.error || err.message;
            setError(message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [getStatus]);

    return { status, loading, error, getStatus, updateOpenRgb };
};
