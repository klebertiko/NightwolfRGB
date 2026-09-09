import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import { OpenRGBLauncher } from './launcher/openrgb-launcher';

import openrgb from './controllers/openrgb.controller';
import engineRoutes from './routes/engine.routes';
import devicesRoutes from './routes/devices.routes';
import profilesRoutes from './routes/profiles.routes';
import openrgbProfilesRoutes from './routes/openrgb-profiles.routes';
import cleanupRoutes from './routes/cleanup.routes';
import effectsRoutes from './routes/effects.routes';
import pluginsRoutes from './routes/plugins.routes';
import updateRoutes from './routes/update.routes';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.SERVER_PORT || 3001;
const OPENRGB_HOST = process.env.OPENRGB_HOST || '127.0.0.1';
const OPENRGB_PORT = parseInt(process.env.OPENRGB_PORT || '6742');
const AUTO_START_OPENRGB = process.env.AUTO_START_OPENRGB !== 'false';

const launcher = new OpenRGBLauncher(OPENRGB_HOST, OPENRGB_PORT);

const CORS_ORIGINS = new Set([
    'http://127.0.0.1:5173',
    'http://localhost:5173',
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || CORS_ORIGINS.has(origin) || origin === 'null' || origin.startsWith('file:')) {
            callback(null, true);
            return;
        }
        callback(new Error('Not allowed by CORS'));
    },
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ 
        status: 'Nightwolf RGB Backend is running', 
        version: '1.0.0',
        openrgb: openrgb.getStatus()
    });
});

const clients = new Set<any>();

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected');
    clients.add(ws);

    ws.send(JSON.stringify({
        type: 'status',
        data: openrgb.getStatus()
    }));

    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        clients.delete(ws);
    });
});

function broadcast(type: string, data: any) {
    const message = JSON.stringify({ type, data });
    clients.forEach((client: any) => {
        if (client.readyState === 1) {
            client.send(message);
        }
    });
}

app.get('/api/status', (req, res) => {
    res.json(openrgb.getStatus());
});

// Add a simple root route to confirm backend is running
app.get('/', (req, res) => {
    res.json({ message: 'Nightwolf RGB Backend is running. Access API endpoints under /api' });
});

app.use('/api/engine', engineRoutes(broadcast));   // mount first — no route clash risk
app.use('/api/devices', devicesRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/openrgb-profiles', openrgbProfilesRoutes);
app.use('/api/cleanup', cleanupRoutes);
app.use('/api/effects', effectsRoutes);
app.use('/api/plugins', pluginsRoutes);
app.use('/api/update', updateRoutes(launcher, broadcast));

app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
});

async function start() {
    console.log('🐺 Nightwolf RGB Backend Starting...\n');

    try {
        // Auto-start OpenRGB if enabled
        if (AUTO_START_OPENRGB) {
            console.log('🔧 Auto-start mode enabled');
            await launcher.ensureOpenRGBRunning();
        } else {
            console.log('ℹ️  Auto-start disabled (manual mode)');
        }

        // Connect to OpenRGB SDK
        const connected = await openrgb.connect(OPENRGB_HOST, OPENRGB_PORT);
        openrgb.onDeviceListUpdated(() => broadcast('status', openrgb.getStatus()));

        if (!connected) {
            console.warn('⚠️  Failed to connect to OpenRGB. Will retry in background...');
            setInterval(async () => {
                if (!openrgb.connected) {
                    console.log('🔄 Attempting to reconnect to OpenRGB...');
                    const success = await openrgb.connect(OPENRGB_HOST, OPENRGB_PORT);
                    if (success) {
                        broadcast('status', openrgb.getStatus());
                    }
                }
            }, 5000);
        }

        // Start server
        server.listen(Number(PORT), '127.0.0.1', () => {
            console.log(`\n┌─────────────────────────────────────────┐`);
            console.log(`│   🐺 Nightwolf RGB - Ready!            │`);
            console.log(`└─────────────────────────────────────────┘`);
            console.log(`🚀 Server:    http://127.0.0.1:${PORT}`);
            console.log(`📡 WebSocket: ws://127.0.0.1:${PORT}`);
            console.log(`🔗 OpenRGB:   ${connected ? '✅ Connected' : '❌ Disconnected'}`);

            // Launcher status
            const launcherStatus = launcher.getStatus();
            if (launcherStatus.autoStarted) {
                console.log(`🤖 OpenRGB:   Auto-started (PID: ${launcherStatus.pid})`);
            } else if (launcherStatus.processRunning) {
                console.log(`ℹ️  OpenRGB:   Using existing instance`);
            }

            console.log(`\n👉 Open: http://127.0.0.1:5173`);
            console.log(`\nPress Ctrl+C to stop\n`);
        });

    } catch (error) {
        console.error('❌ Failed to start:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');

    console.log('   Disconnecting from OpenRGB...');
    await openrgb.disconnect();

    console.log('   Cleaning up launcher...');
    await launcher.cleanup();

    console.log('✅ Goodbye!\n');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM...');

    // Stop any running software effects
    // We can import effects controller here or better yet, make effects controller listen to process events
    // For now, let's rely on openrgb disconnect which closes the socket

    await launcher.cleanup();
    await openrgb.disconnect();
    process.exit(0);
});

// Start the application
start();

// Add unhandled exception and rejection handlers for better debugging
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export { app, broadcast };
