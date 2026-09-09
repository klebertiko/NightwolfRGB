/**
 * OpenRGB SDK plugin packets (protocol v4+).
 * Packet 200 = plugin list. Packet 201 = plugin-specific (Effects plugin).
 * Parsers are pure — no I/O.
 */

export interface OpenRgbPlugin {
    name: string;
    description: string;
    version: string;
    index: number;
    protocolVersion: number;
}

export interface PluginEffect {
    name: string;
    description: string;
    enabled: boolean;
}

export const FX_REQUEST_EFFECT_LIST = 0;
export const FX_START_EFFECT = 20;
export const FX_STOP_EFFECT = 41;

function readCString(buf: Buffer, offset: number): { text: string; next: number } {
    const len = buf.readUInt16LE(offset);
    offset += 2;
    const take = Math.max(0, len);
    const raw = buf.subarray(offset, offset + take);
    const text = raw.toString('utf8').replace(/\0+$/g, '');
    return { text, next: offset + take };
}

export function writeCString(text: string): Buffer {
    const raw = Buffer.from(text, 'utf8');
    const body = Buffer.alloc(2 + raw.length + 1);
    body.writeUInt16LE(raw.length + 1, 0);
    raw.copy(body, 2);
    body.writeUInt8(0, 2 + raw.length);
    return body;
}

/** Full 200 response body, including leading data_size. */
export function parsePluginList(buffer: Buffer): OpenRgbPlugin[] {
    if (!buffer || buffer.length < 6) return [];
    let offset = 4;
    const num = buffer.readUInt16LE(offset);
    offset += 2;
    const plugins: OpenRgbPlugin[] = [];
    for (let i = 0; i < num; i++) {
        if (offset + 2 > buffer.length) break;
        const name = readCString(buffer, offset);
        offset = name.next;
        const description = readCString(buffer, offset);
        offset = description.next;
        const version = readCString(buffer, offset);
        offset = version.next;
        if (offset + 8 > buffer.length) break;
        const index = buffer.readUInt32LE(offset);
        offset += 4;
        const protocolVersion = buffer.readUInt32LE(offset);
        offset += 4;
        plugins.push({
            name: name.text,
            description: description.text,
            version: version.text,
            index,
            protocolVersion,
        });
    }
    return plugins;
}

export function encodeFxPacket(fxPktId: number, rest: Buffer = Buffer.alloc(0)): Buffer {
    const head = Buffer.alloc(4);
    head.writeUInt32LE(fxPktId >>> 0, 0);
    return Buffer.concat([head, rest]);
}

/**
 * Plugin 201 body: fx_pkt_id (4) then Effect List.
 * pluginProtocolVersion >= 2 includes data_size before num_effects.
 */
export function parseEffectList(buffer: Buffer, pluginProtocolVersion = 1): PluginEffect[] {
    if (!buffer || buffer.length < 6) return [];
    let offset = 4;
    if (pluginProtocolVersion >= 2) {
        if (offset + 4 > buffer.length) return [];
        offset += 4;
    }
    if (offset + 2 > buffer.length) return [];
    const num = buffer.readUInt16LE(offset);
    offset += 2;
    const effects: PluginEffect[] = [];
    for (let i = 0; i < num; i++) {
        if (offset + 2 > buffer.length) break;
        const name = readCString(buffer, offset);
        offset = name.next;
        const description = readCString(buffer, offset);
        offset = description.next;
        if (offset >= buffer.length) break;
        const enabled = buffer.readUInt8(offset) !== 0;
        offset += 1;
        effects.push({ name: name.text, description: description.text, enabled });
    }
    return effects;
}

export function isEffectsPlugin(plugin: OpenRgbPlugin): boolean {
    return /effect/i.test(plugin.name);
}
