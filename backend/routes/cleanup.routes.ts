import express, { Request, Response } from 'express';
const router = express.Router();
import cleanupService from '../controllers/cleanup.controller';

// Get cleanup status
router.get('/status', async (req: Request, res: Response) => {
    try {
        const status = await cleanupService.getStatusReport();
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Detect conflicting processes
router.get('/detect', async (req: Request, res: Response) => {
    try {
        const detection = await cleanupService.detectConflictingProcesses();
        res.json(detection);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Kill conflicting processes
router.post('/kill-processes', async (req: Request, res: Response) => {
    try {
        const result = await cleanupService.killConflictingProcesses();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Disable RGB services
router.post('/disable-services', async (req: Request, res: Response) => {
    try {
        const result = await cleanupService.disableRGBServices();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Full cleanup (processes + services)
router.post('/full', async (req: Request, res: Response) => {
    try {
        const result = await cleanupService.fullCleanup();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
