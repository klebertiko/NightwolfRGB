import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export const useDevices = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDevices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getDevices();
            setDevices(response.data);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching devices:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const setColor = useCallback(async (deviceId: any, color: any) => {
        try {
            await api.setDeviceColor(deviceId, color);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting color:', err);
            throw err;
        }
    }, [fetchDevices]);

    const setMode = useCallback(async (deviceId: any, modeId: any) => {
        try {
            await api.setDeviceMode(deviceId, modeId);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting mode:', err);
            throw err;
        }
    }, [fetchDevices]);

    const setBrightness = useCallback(async (deviceId: any, brightness: any) => {
        try {
            await api.setDeviceBrightness(deviceId, brightness);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting brightness:', err);
            throw err;
        }
    }, [fetchDevices]);

    const syncAll = useCallback(async (color: any) => {
        try {
            await api.syncAllDevices(color);
            await fetchDevices();
        } catch (err) {
            console.error('Error syncing devices:', err);
            throw err;
        }
    }, [fetchDevices]);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    return {
        devices,
        loading,
        error,
        refresh: fetchDevices,
        setColor,
        setMode,
        setBrightness,
        syncAll
    };
};
