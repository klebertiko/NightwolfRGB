import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const api = {
    getStatus: () => apiClient.get('/api/status'),
    getDevices: () => apiClient.get('/api/devices'),
    getDevice: (id) => apiClient.get(`/api/devices/${id}`),
    setDeviceColor: (id, color) => apiClient.post(`/api/devices/${id}/color`, { color }),
    setDeviceMode: (id, modeId) => apiClient.post(`/api/devices/${id}/mode`, { modeId }),
    setDeviceBrightness: (id, brightness) => apiClient.post(`/api/devices/${id}/brightness`, { brightness }),
    syncAllDevices: (color) => apiClient.post('/api/devices/sync', { color }),
    getProfiles: () => apiClient.get('/api/profiles'),
    getProfile: (id) => apiClient.get(`/api/profiles/${id}`),
    createProfile: (data) => apiClient.post('/api/profiles', data),
    updateProfile: (id, data) => apiClient.put(`/api/profiles/${id}`, data),
    deleteProfile: (id) => apiClient.delete(`/api/profiles/${id}`),
    applyProfile: (id) => apiClient.post(`/api/profiles/${id}/apply`),
    createSnapshot: () => apiClient.post('/api/profiles/snapshot')
};

export default apiClient;
