import express, { Request, Response } from 'express';
const router = express.Router();
import profiles from '../controllers/profiles.controller';
import openrgb from '../controllers/openrgb.controller';

router.get('/', async (req: Request, res: Response) => {
    try {
        const allProfiles = await profiles.getAll();
        res.json(allProfiles);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const profile = await profiles.getById(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const newProfile = await profiles.create(req.body);
        res.status(201).json(newProfile);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/snapshot', async (req: Request, res: Response) => {
    try {
        const devices = await openrgb.refreshDevices();
        const snapshot = await profiles.createSnapshot(devices);
        res.json(snapshot);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', async (req: Request, res: Response) => {
    try {
        const updated = await profiles.update(req.params.id, req.body);
        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await profiles.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/apply', async (req: Request, res: Response) => {
    try {
        const profile = await profiles.getById(req.params.id);
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        const results = [];
        for (const deviceConfig of profile.devices) {
            try {
                await openrgb.setDeviceColor(deviceConfig.id, deviceConfig.color);
                if (deviceConfig.mode !== undefined) {
                    await openrgb.setDeviceMode(deviceConfig.id, deviceConfig.mode);
                }
                results.push({ deviceId: deviceConfig.id, success: true });
            } catch (error: any) {
                results.push({ deviceId: deviceConfig.id, success: false, error: error.message });
            }
        }

        res.json({ success: true, results });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
