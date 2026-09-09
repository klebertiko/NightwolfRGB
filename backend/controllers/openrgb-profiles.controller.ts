/**
 * Native OpenRGB profile controller.
 *
 * OpenRGB stores profiles as .orp files in its data directory.
 * This controller delegates all profile I/O to the OpenRGB process
 * via the SDK, so Nightwolf never needs to understand the file format.
 */

import openrgb from './openrgb.controller';

class OpenRGBProfilesController {
    async list(): Promise<string[]> {
        return openrgb.getNativeProfiles();
    }

    async save(name: string): Promise<{ success: boolean; name: string }> {
        if (!name || !name.trim()) throw new Error('Nome do perfil não pode ser vazio');
        return openrgb.saveNativeProfile(name.trim());
    }

    async load(name: string): Promise<{ success: boolean; name: string }> {
        if (!name) throw new Error('Nome do perfil é obrigatório');
        return openrgb.loadNativeProfile(name);
    }

    async remove(name: string): Promise<{ success: boolean; name: string }> {
        if (!name) throw new Error('Nome do perfil é obrigatório');
        return openrgb.deleteNativeProfile(name);
    }
}

export default new OpenRGBProfilesController();
