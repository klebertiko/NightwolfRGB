import { promises as fs } from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const canvasLayout = require('../../scripts/canvas-layout.cjs') as {
    autoLayout: (devices: any[], canvas?: { width: number; height: number }) => CanvasLayout;
    mergeLayout: (saved: CanvasLayout | null, liveDevices: any[]) => CanvasLayout;
    nudgeDevice: (layout: CanvasLayout, deviceId: string | number, dx: number, dy: number) => CanvasLayout;
};

export interface CanvasDevicePlacement {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    ledCount: number;
}

export interface CanvasLayout {
    canvasWidth: number;
    canvasHeight: number;
    devices: CanvasDevicePlacement[];
    updatedAt?: string;
}

const LAYOUT_FILE = path.join(__dirname, '../data/layout.json');

class LayoutController {
    private layout: CanvasLayout | null = null;
    private ready: Promise<void>;

    constructor() {
        this.ready = this.load();
    }

    private async load(): Promise<void> {
        try {
            const data = await fs.readFile(LAYOUT_FILE, 'utf8');
            this.layout = JSON.parse(data);
        } catch {
            this.layout = null;
        }
    }

    private async ensureDir(): Promise<void> {
        const dir = path.dirname(LAYOUT_FILE);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    private async persist(): Promise<void> {
        await this.ensureDir();
        await fs.writeFile(LAYOUT_FILE, JSON.stringify(this.layout, null, 2));
    }

    async get(): Promise<CanvasLayout | null> {
        await this.ready;
        return this.layout;
    }

    async getOrAuto(liveDevices: any[]): Promise<CanvasLayout> {
        await this.ready;
        if (!this.layout || !this.layout.devices?.length) {
            this.layout = canvasLayout.autoLayout(liveDevices);
            await this.persist();
            return this.layout;
        }

        const merged = canvasLayout.mergeLayout(this.layout, liveDevices);
        const prevIds = (this.layout.devices || []).map((d) => String(d.id)).join(',');
        const nextIds = (merged.devices || []).map((d) => String(d.id)).join(',');
        const ledChanged = (this.layout.devices || []).some((d) => {
            const m = merged.devices.find((x) => String(x.id) === String(d.id));
            return m && m.ledCount !== d.ledCount;
        });

        this.layout = merged;
        if (prevIds !== nextIds || ledChanged) {
            await this.persist();
        }
        return this.layout;
    }

    async save(next: CanvasLayout): Promise<CanvasLayout> {
        await this.ready;
        this.layout = {
            ...next,
            updatedAt: new Date().toISOString(),
        };
        await this.persist();
        return this.layout;
    }

    async autoFromDevices(liveDevices: any[]): Promise<CanvasLayout> {
        await this.ready;
        this.layout = canvasLayout.autoLayout(liveDevices);
        await this.persist();
        return this.layout;
    }

    async nudge(deviceId: string | number, dx: number, dy: number): Promise<CanvasLayout> {
        await this.ready;
        if (!this.layout) {
            throw new Error('Nenhum layout salvo — rode auto-layout primeiro');
        }
        this.layout = canvasLayout.nudgeDevice(this.layout, deviceId, dx, dy);
        await this.persist();
        return this.layout;
    }
}

export default new LayoutController();
