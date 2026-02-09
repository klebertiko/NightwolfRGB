import { promises as fs } from 'fs';
import * as path from 'path';

const PROFILES_FILE = path.join(__dirname, '../data/profiles.json');

export interface Profile {
    id: string;
    name: string;
    description: string;
    devices: any[];
    createdAt: string;
    updatedAt: string;
}

export class ProfilesController {
    private profiles: Profile[];

    constructor() {
        this.profiles = [];
        this.init();
    }

    async init(): Promise<void> {
        try {
            const data = await fs.readFile(PROFILES_FILE, 'utf8');
            this.profiles = JSON.parse(data);
        } catch (error) {
            this.profiles = [];
            await this.saveToFile();
        }
    }

    async saveToFile(): Promise<void> {
        // Ensure data directory exists
        const dir = path.dirname(PROFILES_FILE);
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }

        await fs.writeFile(PROFILES_FILE, JSON.stringify(this.profiles, null, 2));
    }

    async getAll(): Promise<Profile[]> {
        return this.profiles;
    }

    async getById(id: string): Promise<Profile | undefined> {
        return this.profiles.find(p => p.id === id);
    }

    async create(profileData: any): Promise<Profile> {
        const newProfile: Profile = {
            id: Date.now().toString(),
            name: profileData.name,
            description: profileData.description || '',
            devices: profileData.devices,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.profiles.push(newProfile);
        await this.saveToFile();
        return newProfile;
    }

    async update(id: string, profileData: any): Promise<Profile> {
        const index = this.profiles.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Profile not found');

        this.profiles[index] = {
            ...this.profiles[index],
            ...profileData,
            id,
            updatedAt: new Date().toISOString()
        };

        await this.saveToFile();
        return this.profiles[index];
    }

    async delete(id: string): Promise<{ success: boolean }> {
        const index = this.profiles.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Profile not found');

        this.profiles.splice(index, 1);
        await this.saveToFile();
        return { success: true };
    }

    async createSnapshot(devices: any[]): Promise<any> {
        return {
            devices: devices.map(device => ({
                id: device.id,
                name: device.name,
                color: device.colors[0] || { red: 0, green: 0, blue: 0 },
                mode: device.activeMode,
                brightness: 100
            }))
        };
    }
}

export default new ProfilesController();
