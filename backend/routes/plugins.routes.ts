import express, { Request, Response } from 'express';
import openrgb from '../controllers/openrgb.controller';
import effects from '../controllers/effects.controller';
import { SDK_CAPABILITIES } from '../lib/sdk-capabilities';

const router = express.Router();

router.get('/capabilities', (_req: Request, res: Response) => {
    res.json(SDK_CAPABILITIES);
});

router.get('/', async (_req: Request, res: Response) => {
    try {
        const plugins = await openrgb.getPluginList();
        res.json({
            plugins,
            protocolVersion: openrgb.getStatus().protocolVersion,
            store: false,
            note: 'Lista dos plugins já carregados no OpenRGB. Não é uma loja.',
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/effects', async (_req: Request, res: Response) => {
    try {
        const result = await openrgb.getEffectsPluginEffects();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/effects/start', async (req: Request, res: Response) => {
    try {
        const name = String(req.body?.name || '').trim();
        if (!name) return res.status(400).json({ error: 'name é obrigatório' });
        effects.stopEffect();
        const result = await openrgb.startPluginEffect(name);
        res.json(result);
    } catch (error: any) {
        const status = error.code === 'NO_EFFECTS_PLUGIN' ? 409 : 500;
        res.status(status).json({ error: error.message, code: error.code });
    }
});

router.post('/effects/stop', async (req: Request, res: Response) => {
    try {
        const name = String(req.body?.name || '').trim();
        if (!name) return res.status(400).json({ error: 'name é obrigatório' });
        const result = await openrgb.stopPluginEffect(name);
        res.json(result);
    } catch (error: any) {
        const status = error.code === 'NO_EFFECTS_PLUGIN' ? 409 : 500;
        res.status(status).json({ error: error.message, code: error.code });
    }
});

export default router;
