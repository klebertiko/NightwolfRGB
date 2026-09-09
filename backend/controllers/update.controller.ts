import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { OpenRGBLauncher } from '../launcher/openrgb-launcher';
import openrgb from './openrgb.controller';
import effects from './effects.controller';

const bundle = require('../../scripts/openrgb-bundle.cjs') as {
    inventory: (root: string) => {
        installed: boolean;
        exe: string;
        tag: string | null;
        asset: string | null;
        updatedAt: string | null;
    };
};

function projectRoot() {
    const fromEnv = process.env.NIGHTWOLF_ROOT;
    if (fromEnv) return path.resolve(fromEnv);
    const cwd = process.cwd();
    if (fs.existsSync(path.join(cwd, 'bin', 'OpenRGB', 'README.md'))) return cwd;
    const parent = path.resolve(cwd, '..');
    if (fs.existsSync(path.join(parent, 'bin', 'OpenRGB', 'README.md'))) return parent;
    return path.resolve(__dirname, '../..');
}

function appVersion() {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot(), 'package.json'), 'utf8'));
        return pkg.version || '0.0.0';
    } catch {
        return '0.0.0';
    }
}

export function getUpdateStatus() {
    const version = appVersion();
    const openRgb = bundle.inventory(projectRoot());
    return {
        appVersion: version,
        appUpdate: {
            available: false,
            version: null as string | null,
            notes: null as string | null,
        },
        openRgb: {
            installed: openRgb.installed,
            tag: openRgb.tag,
            asset: openRgb.asset,
            updatedAt: openRgb.updatedAt,
        },
    };
}

export async function updateOpenRgb(launcher: OpenRGBLauncher, broadcast: (type: string, data: unknown) => void) {
    const root = projectRoot();
    const script = path.join(root, 'scripts', 'update-openrgb.cjs');
    if (!fs.existsSync(script)) {
        throw new Error('scripts/update-openrgb.cjs missing');
    }

    effects.stopEffect();
    await openrgb.disconnect();
    await launcher.forceStopForUpdate();

    const result = spawnSync(process.execPath, [script], {
        cwd: root,
        encoding: 'utf8',
        timeout: 180000,
        windowsHide: true,
    });
    if (result.status !== 0) {
        const detail = (result.stderr || result.stdout || '').trim();
        throw new Error(detail || 'OpenRGB update failed');
    }

    await launcher.startOpenRGB();
    const connected = await openrgb.connect(
        process.env.OPENRGB_HOST || '127.0.0.1',
        parseInt(process.env.OPENRGB_PORT || '6742', 10)
    );
    broadcast('status', openrgb.getStatus());

    return {
        success: true,
        connected,
        openRgb: bundle.inventory(root),
        log: (result.stdout || '').trim().slice(-2000),
    };
}
