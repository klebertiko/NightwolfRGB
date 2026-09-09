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
        const refresh = req.query.refresh === '1';
        const devices = await openrgb.getDevices(refresh);
        res.json(devices);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
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

router.post('/rescan', async (_req: Request, res: Response) => {
    try {
        const result = await openrgb.rescanDevices();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const devices = await openrgb.getDevices();
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

router.post('/:id/zones/:zoneId/color', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const zoneId = parseInt(req.params.zoneId);
        const { color, brightness } = req.body;

        if (!color) return res.status(400).json({ error: 'color é obrigatório' });

        const result = await openrgb.setZoneColor(deviceId, zoneId, color, brightness ?? 100);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/zones/:zoneId/resize', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const zoneId = parseInt(req.params.zoneId);
        const length = Number(req.body.length);
        if (!Number.isFinite(length)) return res.status(400).json({ error: 'length é obrigatório' });
        const result = await openrgb.resizeZone(deviceId, zoneId, length);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/zones/:zoneId/segments/:segmentId/color', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const zoneId = parseInt(req.params.zoneId);
        const segmentId = parseInt(req.params.segmentId);
        const { color, brightness } = req.body;
        if (!color) return res.status(400).json({ error: 'color é obrigatório' });
        const result = await openrgb.setSegmentColor(deviceId, zoneId, segmentId, color, brightness ?? 100);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/zones/:zoneId/segments', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const zoneId = parseInt(req.params.zoneId);
        const { name, start, length } = req.body;
        if (!name) return res.status(400).json({ error: 'name é obrigatório' });
        const result = await openrgb.addSegment(deviceId, zoneId, name, Number(start) || 0, Number(length) || 1);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.delete('/:id/zones/:zoneId/segments', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const zoneId = parseInt(req.params.zoneId);
        const result = await openrgb.clearSegments(deviceId, zoneId);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/leds/:ledId/color', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const ledId = parseInt(req.params.ledId);
        const { color, brightness } = req.body;

        if (!color) return res.status(400).json({ error: 'color é obrigatório' });

        const result = await openrgb.setSingleLed(deviceId, ledId, color, brightness ?? 100);
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/mode-params', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const { modeId, speed, brightness, direction, colors, colorMode } = req.body;

        if (modeId === undefined) return res.status(400).json({ error: 'modeId é obrigatório' });

        const result = await openrgb.setDeviceModeWithParams(deviceId, modeId, {
            speed, brightness, direction, colors, colorMode,
        });
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

router.post('/:id/mode-save', async (req: Request, res: Response) => {
    try {
        const deviceId = parseInt(req.params.id);
        const { modeId, speed, brightness, direction, colors, colorMode } = req.body;
        if (modeId === undefined) return res.status(400).json({ error: 'modeId é obrigatório' });
        const result = await openrgb.saveDeviceMode(deviceId, modeId, {
            speed, brightness, direction, colors, colorMode,
        });
        res.json(result);
    } catch (error: any) {
        return handleError(res, error);
    }
});

export default router;
