import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { DeviceData, RGBColor } from '../types';

export const useDevices = () => {
    const [devices, setDevices] = useState<DeviceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const setColor = useCallback(async (deviceId: number, color: string, brightness = 100) => {
        try {
            await api.setDeviceColor(deviceId, color, brightness);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting color:', err);
            throw err;
        }
    }, [fetchDevices]);

    const setMode = useCallback(async (deviceId: number, modeId: number) => {
        try {
            await api.setDeviceMode(deviceId, modeId);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting mode:', err);
            throw err;
        }
    }, [fetchDevices]);

    const setModeWithParams = useCallback(async (
        deviceId: number,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: RGBColor[]; colorMode?: number },
    ) => {
        try {
            const res = await api.setDeviceModeParams(deviceId, modeId, params);
            const device = (res.data as { device?: DeviceData })?.device;
            if (device) {
                setDevices((prev) => prev.map((d) => (d.id === deviceId ? device : d)));
            } else {
                await fetchDevices();
            }
        } catch (err) {
            console.error('Error setting mode params:', err);
            throw err;
        }
    }, [fetchDevices]);

    const saveMode = useCallback(async (
        deviceId: number,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: RGBColor[]; colorMode?: number } = {},
    ) => {
        try {
            const res = await api.saveDeviceMode(deviceId, modeId, params);
            const device = (res.data as { device?: DeviceData })?.device;
            if (device) {
                setDevices((prev) => prev.map((d) => (d.id === deviceId ? device : d)));
            } else {
                await fetchDevices();
            }
        } catch (err) {
            console.error('Error saving mode:', err);
            throw err;
        }
    }, [fetchDevices]);

    const setBrightness = useCallback(async (deviceId: number, brightness: number) => {
        try {
            await api.setDeviceBrightness(deviceId, brightness);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting brightness:', err);
            throw err;
        }
    }, [fetchDevices]);

    const syncAll = useCallback(async (color: string, brightness = 100) => {
        try {
            await api.syncAllDevices(color, brightness);
            await fetchDevices();
        } catch (err) {
            console.error('Error syncing devices:', err);
            throw err;
        }
    }, [fetchDevices]);

    /** Trigger OpenRGB USB re-enumeration, then refresh the device list. */
    const rescan = useCallback(async () => {
        try {
            setScanning(true);
            await api.rescanDevices();
            await fetchDevices();
        } catch (err) {
            console.error('Error rescanning devices:', err);
            throw err;
        } finally {
            setScanning(false);
        }
    }, [fetchDevices]);

    /** Paint every LED in a single zone. */
    const setZoneColor = useCallback(async (
        deviceId: number,
        zoneId: number,
        color: string,
        brightness = 100,
    ) => {
        try {
            await api.setZoneColor(deviceId, zoneId, color, brightness);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting zone color:', err);
            throw err;
        }
    }, [fetchDevices]);

    /** Paint a single LED. Device is automatically put into Direct mode by backend. */
    const setSingleLed = useCallback(async (
        deviceId: number,
        ledId: number,
        color: string,
        brightness = 100,
    ) => {
        try {
            await api.setSingleLed(deviceId, ledId, color, brightness);
        } catch (err) {
            console.error('Error setting LED color:', err);
            throw err;
        }
    }, []);

    const resizeZone = useCallback(async (deviceId: number, zoneId: number, length: number) => {
        try {
            await api.resizeZone(deviceId, zoneId, length);
            await fetchDevices();
        } catch (err) {
            console.error('Error resizing zone:', err);
            throw err;
        }
    }, [fetchDevices]);

    const setSegmentColor = useCallback(async (
        deviceId: number,
        zoneId: number,
        segmentId: number,
        color: string,
        brightness = 100,
    ) => {
        try {
            await api.setSegmentColor(deviceId, zoneId, segmentId, color, brightness);
            await fetchDevices();
        } catch (err) {
            console.error('Error setting segment color:', err);
            throw err;
        }
    }, [fetchDevices]);

    const addSegment = useCallback(async (
        deviceId: number,
        zoneId: number,
        name: string,
        start: number,
        length: number,
    ) => {
        try {
            await api.addSegment(deviceId, zoneId, name, start, length);
            await fetchDevices();
        } catch (err) {
            console.error('Error adding segment:', err);
            throw err;
        }
    }, [fetchDevices]);

    const clearSegments = useCallback(async (deviceId: number, zoneId: number) => {
        try {
            await api.clearSegments(deviceId, zoneId);
            await fetchDevices();
        } catch (err) {
            console.error('Error clearing segments:', err);
            throw err;
        }
    }, [fetchDevices]);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    return {
        devices,
        loading,
        scanning,
        error,
        refresh: fetchDevices,
        rescan,
        setColor,
        setMode,
        setModeWithParams,
        saveMode,
        setBrightness,
        syncAll,
        setZoneColor,
        setSingleLed,
        resizeZone,
        setSegmentColor,
        addSegment,
        clearSegments,
    };
};
