import express, { Request, Response } from 'express';
import profilesCtrl from '../controllers/openrgb-profiles.controller';

const router = express.Router();

// GET  /openrgb-profiles        — list profile names
router.get('/', async (_req: Request, res: Response) => {
    try {
        const list = await profilesCtrl.list();
        res.json(list);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /openrgb-profiles/save   — save current state as a named profile
router.post('/save', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const result = await profilesCtrl.save(name);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// POST /openrgb-profiles/load   — load a profile by name
router.post('/load', async (req: Request, res: Response) => {
    try {
        const { name } = req.body;
        const result = await profilesCtrl.load(name);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /openrgb-profiles/:name — delete a profile
router.delete('/:name', async (req: Request, res: Response) => {
    try {
        const result = await profilesCtrl.remove(req.params.name);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
