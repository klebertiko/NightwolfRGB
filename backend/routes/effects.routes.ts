import express, { Request, Response } from 'express';
import effects from '../controllers/effects.controller';

const router = express.Router();

router.get('/status', (req: Request, res: Response) => {
    res.json(effects.getStatus());
});

router.post('/start', async (req: Request, res: Response) => {
    try {
        const { type, options } = req.body; // type: 'breathing', options: { color, speed }

        if (!type) {
            return res.status(400).json({ error: 'Effect type is required' });
        }

        const result = await effects.startEffect(type, options);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/stop', (req: Request, res: Response) => {
    effects.stopEffect();
    res.json({ success: true, message: 'Effect stopped' });
});

export default router;
