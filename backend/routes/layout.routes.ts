import express, { Request, Response } from 'express';
import layout from '../controllers/layout.controller';
import openrgb from '../controllers/openrgb.controller';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const devices = await openrgb.refreshDevices();
        const current = await layout.getOrAuto(devices);
        res.json(current);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/', async (req: Request, res: Response) => {
    try {
        const body = req.body;
        if (!body || typeof body.canvasWidth !== 'number' || !Array.isArray(body.devices)) {
            return res.status(400).json({ error: 'layout inválido' });
        }
        const saved = await layout.save(body);
        res.json(saved);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/auto', async (_req: Request, res: Response) => {
    try {
        const devices = await openrgb.refreshDevices();
        const next = await layout.autoFromDevices(devices);
        res.json(next);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/nudge', async (req: Request, res: Response) => {
    try {
        const { deviceId, dx = 0, dy = 0 } = req.body || {};
        if (deviceId === undefined || deviceId === null) {
            return res.status(400).json({ error: 'deviceId é obrigatório' });
        }
        // Ensure layout exists against live devices before nudging
        const devices = await openrgb.refreshDevices();
        await layout.getOrAuto(devices);
        const next = await layout.nudge(deviceId, Number(dx) || 0, Number(dy) || 0);
        res.json(next);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
