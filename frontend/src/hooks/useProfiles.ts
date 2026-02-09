import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export const useProfiles = () => {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProfiles = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getProfiles();
            setProfiles(response.data);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching profiles:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createProfile = useCallback(async (name: any, description: any) => {
        try {
            const snapshotResponse = await api.createSnapshot();

            const profileData = {
                name,
                description,
                devices: snapshotResponse.data.devices
            };

            await api.createProfile(profileData);
            await fetchProfiles();
        } catch (err) {
            console.error('Error creating profile:', err);
            throw err;
        }
    }, [fetchProfiles]);

    const applyProfile = useCallback(async (profileId: any) => {
        try {
            await api.applyProfile(profileId);
        } catch (err) {
            console.error('Error applying profile:', err);
            throw err;
        }
    }, []);

    const deleteProfile = useCallback(async (profileId: any) => {
        try {
            await api.deleteProfile(profileId);
            await fetchProfiles();
        } catch (err) {
            console.error('Error deleting profile:', err);
            throw err;
        }
    }, [fetchProfiles]);

    useEffect(() => {
        fetchProfiles();
    }, [fetchProfiles]);

    return {
        profiles,
        loading,
        error,
        refresh: fetchProfiles,
        createProfile,
        applyProfile,
        deleteProfile
    };
};
