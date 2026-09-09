import express, { Request, Response } from 'express';
import { OpenRGBLauncher } from '../launcher/openrgb-launcher';
import { getUpdateStatus, updateOpenRgb } from '../controllers/update.controller';

export default function updateRoutes(
    launcher: OpenRGBLauncher,
    broadcast: (type: string, data: unknown) => void
) {
    const router = express.Router();

    router.get('/status', (_req: Request, res: Response) => {
        res.json(getUpdateStatus());
    });

    router.post('/openrgb', async (_req: Request, res: Response) => {
        try {
            const result = await updateOpenRgb(launcher, broadcast);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
