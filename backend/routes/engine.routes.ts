import express, { Request, Response } from 'express';
import effects from '../controllers/effects.controller';
import openrgb from '../controllers/openrgb.controller';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { engine } = require('../../scripts/lighting-engine.cjs') as { engine: any };

export default function engineRoutes(broadcast: (type: string, data: any) => void) {
    const router = express.Router();

    /**
     * GET /api/engine
     * Returns current engine state: { enabled, activeSceneId }
     */
    router.get('/', (_req: Request, res: Response) => {
        res.json(engine.status());
    });

    /**
     * PUT /api/engine
     * Body: { enabled: boolean }
     *
     * enabled = false:
     *   1. Stop any running software effect
     *   2. Disable engine (clears activeSceneId)
     *   3. Paint all devices black (preserves lastPaint for restore)
     *   4. Broadcast engine status + hardware status
     *
     * enabled = true:
     *   1. Enable engine
     *   2. Restore last paint color to all devices
     *   3. Broadcast engine status
     */
    router.put('/', async (req: Request, res: Response) => {
        try {
            const { enabled } = req.body;

            if (typeof enabled !== 'boolean') {
                return res.status(400).json({ error: 'enabled must be a boolean' });
            }

            if (!enabled) {
                effects.stopEffect();
                engine.setEnabled(false);
                await openrgb.paintOff();
                broadcast('engine', engine.status());
                broadcast('status', openrgb.getStatus());
            } else {
                engine.setEnabled(true);
                // Restore last paint if there are connected devices
                try {
                    await openrgb.setAllDevicesColor(openrgb.getLastPaint());
                } catch {
                    // If not connected, restoration is best-effort
                }
                broadcast('engine', engine.status());
            }

            res.json(engine.status());
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
