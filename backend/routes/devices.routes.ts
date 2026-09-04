import express, { Request, Response } from 'express';
const router = express.Router();
import openrgb from '../controllers/openrgb.controller';

function handleError(res: Response, error: any) {
    if (error.code === 'ENGINE_OFF') {
        return res.status(409).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: error.message });
}

router.get('/', async (req: Request, res: Response) => {
    try {
        const devices = await openrgb.refreshDevices();
        res.json(devices);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const devices = await openrgb.refreshDevices();
        const device = devices[deviceId];

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json(device);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/color', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const { color, brightness } = req.body;

        const result = await openrgb.setDeviceColor(deviceId, color, brightness ?? 100);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/mode', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const { modeId } = req.body;

        const result = await openrgb.setDeviceMode(deviceId, modeId);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/brightness', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const { brightness } = req.body;

        const result = await openrgb.setDeviceBrightness(deviceId, brightness);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/sync', async (req: Request, res: Response) => {
    try {
        const { color, brightness } = req.body;
        const results = await openrgb.setAllDevicesColor(color, brightness ?? 100);
        res.json(results);
    } catch (error: any) {
        return handleError(res, error);
    }
});

export default router;
