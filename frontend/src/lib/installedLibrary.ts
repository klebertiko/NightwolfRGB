import type { ThumbKind } from '../components/EffectThumb';
import type { PluginEffect } from '../types';

/** Persistent Biblioteca — effects the user has Aplicar'd at least once. */
export const INSTALLED_LIBRARY_KEY = 'nw-installed-library';
/** Legacy ephemeral key — migrated once into localStorage. */
export const LEGACY_SESSION_LIBRARY_KEY = 'nw-session-library';
export const PLUGIN_PREFIX = 'plugin:';

export const DIRECT_EFFECTS: { id: string; name: string; kind: ThumbKind; blurb: string }[] = [
    { id: 'static', name: 'Estático', kind: 'static', blurb: 'Cor fixa no kit' },
    { id: 'breathing', name: 'Respirar', kind: 'breathing', blurb: 'Pulso suave' },
    { id: 'strobing', name: 'Estrobo', kind: 'strobing', blurb: 'Pisca no ritmo' },
    { id: 'rainbow', name: 'Arco-íris', kind: 'rainbow', blurb: 'Ciclo HSV' },
    { id: 'spectrum', name: 'Espectro', kind: 'spectrum', blurb: 'Varredura de cor' },
    { id: 'canvas-wave', name: 'Canvas', kind: 'canvas', blurb: 'Onda espacial no layout' },
    { id: 'custom', name: 'Sequência', kind: 'custom', blurb: 'Passos definidos por você' },
];

export type InstalledEntry =
    | { kind: 'direct'; effect: (typeof DIRECT_EFFECTS)[number] }
    | { kind: 'plugin'; name: string; description?: string; enabled: boolean };

/** Biblioteca filter chips — only surface types present in the installed set. */
export type LibraryFilter = 'all' | 'direct' | 'openrgb' | 'live';
/** Recentes = apply-history order (ids prepended); A–Z = name. No fake timestamps. */
export type LibrarySort = 'recent' | 'az';

export function installedEntryName(entry: InstalledEntry): string {
    return entry.kind === 'direct' ? entry.effect.name : entry.name;
}

export function isInstalledEntryLive(entry: InstalledEntry, activeEffect: string | null): boolean {
    return entry.kind === 'direct' ? activeEffect === entry.effect.id : entry.enabled;
}

export function availableLibraryFilters(
    entries: InstalledEntry[],
    activeEffect: string | null,
): LibraryFilter[] {
    const chips: LibraryFilter[] = ['all'];
    if (entries.some((e) => e.kind === 'direct')) chips.push('direct');
    if (entries.some((e) => e.kind === 'plugin')) chips.push('openrgb');
    if (entries.some((e) => isInstalledEntryLive(e, activeEffect))) chips.push('live');
    return chips;
}

export function filterAndSortInstalledEntries(
    entries: InstalledEntry[],
    opts: { filter: LibraryFilter; sort: LibrarySort; activeEffect: string | null },
): InstalledEntry[] {
    let list = entries;
    if (opts.filter === 'direct') list = list.filter((e) => e.kind === 'direct');
    else if (opts.filter === 'openrgb') list = list.filter((e) => e.kind === 'plugin');
    else if (opts.filter === 'live') {
        list = list.filter((e) => isInstalledEntryLive(e, opts.activeEffect));
    }
    if (opts.sort === 'az') {
        list = [...list].sort((a, b) =>
            installedEntryName(a).localeCompare(installedEntryName(b), 'pt', { sensitivity: 'base' }),
        );
    }
    return list;
}

export function parseLibraryIds(raw: string | null): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((id): id is string => typeof id === 'string');
    } catch {
        return [];
    }
}

export function writeInstalledLibrary(ids: string[]) {
    try {
        localStorage.setItem(INSTALLED_LIBRARY_KEY, JSON.stringify(ids));
    } catch {
        /* private mode / quota — list stays in React state */
    }
}

export function readInstalledLibrary(): string[] {
    try {
        const fromLocal = parseLibraryIds(localStorage.getItem(INSTALLED_LIBRARY_KEY));
        if (fromLocal.length > 0) return fromLocal;
        const legacy = parseLibraryIds(sessionStorage.getItem(LEGACY_SESSION_LIBRARY_KEY));
        if (legacy.length > 0) {
            writeInstalledLibrary(legacy);
            try {
                sessionStorage.removeItem(LEGACY_SESSION_LIBRARY_KEY);
            } catch {
                /* ignore */
            }
            return legacy;
        }
        return [];
    } catch {
        return [];
    }
}

export function pluginLibraryId(name: string) {
    return `${PLUGIN_PREFIX}${name}`;
}

export function resolveInstalledEntries(
    installedLibrary: string[],
    pluginList: PluginEffect[],
    query = '',
): InstalledEntry[] {
    const q = query.trim().toLowerCase();
    const directById = new Map(DIRECT_EFFECTS.map((e) => [e.id, e]));
    const pluginByName = new Map(pluginList.map((fx) => [fx.name, fx]));
    const entries: InstalledEntry[] = [];
    for (const id of installedLibrary) {
        if (id.startsWith(PLUGIN_PREFIX)) {
            const name = id.slice(PLUGIN_PREFIX.length);
            const fx = pluginByName.get(name);
            if (!fx) continue;
            if (q) {
                const hay = `${fx.name} ${fx.description || ''}`.toLowerCase();
                if (!hay.includes(q)) continue;
            }
            entries.push({
                kind: 'plugin',
                name: fx.name,
                description: fx.description,
                enabled: fx.enabled,
            });
            continue;
        }
        const effect = directById.get(id);
        if (!effect) continue;
        if (
            q &&
            !(
                effect.name.toLowerCase().includes(q) ||
                effect.blurb.toLowerCase().includes(q) ||
                effect.id.includes(q)
            )
        ) {
            continue;
        }
        entries.push({ kind: 'direct', effect });
    }
    return entries;
}
