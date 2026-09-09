import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';

export function wsUrl(base = API_BASE_URL) {
    return base.replace(/^http/, 'ws');
}

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const api = {
    getStatus: () => apiClient.get('/api/status'),

    // ── Devices ──────────────────────────────────────────────────────────────
    getDevices: () => apiClient.get('/api/devices'),
    getDevice: (id: number | string) => apiClient.get(`/api/devices/${id}`),
    rescanDevices: () => apiClient.post('/api/devices/rescan', {}, { timeout: 20000 }),
    setDeviceColor: (id: number | string, color: string, brightness: number) =>
        apiClient.post(`/api/devices/${id}/color`, { color, brightness }),
    setDeviceMode: (id: number | string, modeId: number) =>
        apiClient.post(`/api/devices/${id}/mode`, { modeId }),
    setDeviceModeParams: (
        id: number | string,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: unknown[]; colorMode?: number },
    ) => apiClient.post(`/api/devices/${id}/mode-params`, { modeId, ...params }),
    saveDeviceMode: (
        id: number | string,
        modeId: number,
        params: { speed?: number; brightness?: number; direction?: number; colors?: unknown[]; colorMode?: number } = {},
    ) => apiClient.post(`/api/devices/${id}/mode-save`, { modeId, ...params }),
    setDeviceBrightness: (id: number | string, brightness: number) =>
        apiClient.post(`/api/devices/${id}/brightness`, { brightness }),
    syncAllDevices: (color: string, brightness: number) =>
        apiClient.post('/api/devices/sync', { color, brightness }),

    // Zone-level color (sends to all LEDs in a zone via updateZoneLeds)
    setZoneColor: (
        deviceId: number | string,
        zoneId: number,
        color: string,
        brightness: number,
    ) => apiClient.post(`/api/devices/${deviceId}/zones/${zoneId}/color`, { color, brightness }),

    // Per-LED color (uses updateSingleLed; puts device in Direct mode first)
    setSingleLed: (deviceId: number | string, ledId: number, color: string, brightness = 100) =>
        apiClient.post(`/api/devices/${deviceId}/leds/${ledId}/color`, { color, brightness }),
    resizeZone: (deviceId: number | string, zoneId: number, length: number) =>
        apiClient.post(`/api/devices/${deviceId}/zones/${zoneId}/resize`, { length }),
    setSegmentColor: (
        deviceId: number | string,
        zoneId: number,
        segmentId: number,
        color: string,
        brightness: number,
    ) => apiClient.post(`/api/devices/${deviceId}/zones/${zoneId}/segments/${segmentId}/color`, { color, brightness }),
    addSegment: (
        deviceId: number | string,
        zoneId: number,
        name: string,
        start: number,
        length: number,
    ) => apiClient.post(`/api/devices/${deviceId}/zones/${zoneId}/segments`, { name, start, length }),
    clearSegments: (deviceId: number | string, zoneId: number) =>
        apiClient.delete(`/api/devices/${deviceId}/zones/${zoneId}/segments`),

    // ── Scenes/Profiles (Nightwolf-internal) ─────────────────────────────────
    getProfiles: () => apiClient.get('/api/profiles'),
    getProfile: (id: string) => apiClient.get(`/api/profiles/${id}`),
    createProfile: (data: unknown) => apiClient.post('/api/profiles', data),
    updateProfile: (id: string, data: unknown) => apiClient.put(`/api/profiles/${id}`, data),
    deleteProfile: (id: string) => apiClient.delete(`/api/profiles/${id}`),
    applyProfile: (id: string) => apiClient.post(`/api/profiles/${id}/apply`),
    createSnapshot: () => apiClient.post('/api/profiles/snapshot'),

    // ── Native OpenRGB Profiles (.orp files managed by OpenRGB itself) ────────
    getNativeProfiles: () => apiClient.get<string[]>('/api/openrgb-profiles'),
    saveNativeProfile: (name: string) =>
        apiClient.post('/api/openrgb-profiles/save', { name }),
    loadNativeProfile: (name: string) =>
        apiClient.post('/api/openrgb-profiles/load', { name }),
    deleteNativeProfile: (name: string) =>
        apiClient.delete(`/api/openrgb-profiles/${encodeURIComponent(name)}`),

    // ── Cleanup ───────────────────────────────────────────────────────────────
    getCleanupStatus: () => apiClient.get('/api/cleanup/status'),
    detectCleanup: () => apiClient.get('/api/cleanup/detect'),
    killCleanupProcesses: () => apiClient.post('/api/cleanup/kill-processes'),
    fullCleanup: () => apiClient.post('/api/cleanup/full'),

    // ── Updates ───────────────────────────────────────────────────────────────
    getUpdateStatus: () => apiClient.get('/api/update/status'),
    updateOpenRgb: () => apiClient.post('/api/update/openrgb', {}, { timeout: 180000 }),

    // ── Engine ────────────────────────────────────────────────────────────────
    getEngine: () => apiClient.get('/api/engine'),
    setEngine: (enabled: boolean) => apiClient.put('/api/engine', { enabled }),

    // ── Effects ───────────────────────────────────────────────────────────────
    getEffectsStatus: () => apiClient.get('/api/effects/status'),
    startEffect: (type: string, options: Record<string, unknown>) =>
        apiClient.post('/api/effects/start', { type, options }),
    stopEffect: () => apiClient.post('/api/effects/stop'),

    // ── Plugins (SDK 200/201 — loaded in OpenRGB, not a store) ────────────────
    getPlugins: () => apiClient.get('/api/plugins'),
    getPluginEffects: () => apiClient.get('/api/plugins/effects'),
    startPluginEffect: (name: string) => apiClient.post('/api/plugins/effects/start', { name }),
    stopPluginEffect: (name: string) => apiClient.post('/api/plugins/effects/stop', { name }),
    getSdkCapabilities: () => apiClient.get('/api/plugins/capabilities'),
};

export default apiClient;
