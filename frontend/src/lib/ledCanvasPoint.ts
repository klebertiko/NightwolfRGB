/**
 * LED → canvas point mapping — keep in sync with scripts/canvas-layout.cjs.
 * Prefer OpenRGB zone.matrix topology when present; packed lattice only as fallback.
 */

export interface LedPlacement {
    x: number;
    y: number;
    width: number;
    height: number;
    ledCount?: number;
    /** Optional LED index → normalized (0–1) position from zone.matrix */
    ledNorm?: Record<number, { nx: number; ny: number }>;
}

export interface MatrixLike {
    height: number;
    width: number;
    map: (number | null)[][];
}

export interface ZoneWithMatrix {
    ledsStart?: number;
    ledsCount?: number;
    matrix?: MatrixLike | null;
}

/** Max markers drawn per device so dense kits stay readable (lattice fallback only). */
export const MAX_LED_SAMPLE_MARKERS = 64;

/**
 * Soft DOM budget for matrix topology grids. Halo96-class boards are ~100 cells;
 * only thin above this (stride) so React stays responsive on pathological maps.
 */
export const MAX_MATRIX_TOPOLOGY_CELLS = 400;

export interface MatrixGridCell {
    row: number;
    col: number;
    ledIndex: number | null;
    isVoid: boolean;
}

export interface MatrixGrid {
    width: number;
    height: number;
    cells: MatrixGridCell[];
}

function countNonNull(matrix: MatrixLike): number {
    let n = 0;
    for (const row of matrix.map || []) {
        for (const cell of row || []) {
            if (cell !== null && cell !== undefined) n += 1;
        }
    }
    return n;
}

function richestMatrixZone(
    zones?: ZoneWithMatrix[] | null,
): { matrix: MatrixLike; ledsStart: number } | null {
    const list = (zones || []).filter(
        (z) =>
            z?.matrix &&
            Number(z.matrix.width) > 0 &&
            Number(z.matrix.height) > 0 &&
            Array.isArray(z.matrix.map) &&
            z.matrix.map.length > 0,
    );
    if (!list.length) return null;

    let best = list[0];
    let bestCount = countNonNull(best.matrix!);
    for (let i = 1; i < list.length; i += 1) {
        const c = countNonNull(list[i].matrix!);
        if (c > bestCount) {
            best = list[i];
            bestCount = c;
        }
    }
    return {
        matrix: best.matrix!,
        ledsStart: Math.max(0, Number(best.ledsStart) || 0),
    };
}

/**
 * Pick the richest OpenRGB matrix zone (most non-null cells) and map each
 * LED index → normalized position inside the placement rect.
 * Null matrix cells are gaps (F-row / numpad holes) — no entry, no star.
 */
export function ledNormFromZones(zones?: ZoneWithMatrix[] | null): Record<number, { nx: number; ny: number }> {
    const best = richestMatrixZone(zones);
    if (!best) return {};

    const { matrix, ledsStart } = best;
    const w = Math.max(1, Number(matrix.width) || 1);
    const h = Math.max(1, Number(matrix.height) || 1);
    const out: Record<number, { nx: number; ny: number }> = {};

    for (let row = 0; row < h; row += 1) {
        const rowArr = matrix.map[row] || [];
        for (let col = 0; col < w; col += 1) {
            const cell = rowArr[col];
            if (cell === null || cell === undefined) continue;
            const index = ledsStart + Number(cell);
            out[index] = {
                nx: (col + 0.5) / w,
                ny: (row + 0.5) / h,
            };
        }
    }
    return out;
}

/**
 * Full OpenRGB matrix topology for canvas silhouette tiling.
 * Every cell is either a lit LED tile or a structural void (null → punched hole).
 * Does not apply the lattice 64-cap; soft-strides only above MAX_MATRIX_TOPOLOGY_CELLS.
 */
export function ledMatrixGridFromZones(zones?: ZoneWithMatrix[] | null): MatrixGrid | null {
    const best = richestMatrixZone(zones);
    if (!best) return null;

    const { matrix, ledsStart } = best;
    const w = Math.max(1, Number(matrix.width) || 1);
    const h = Math.max(1, Number(matrix.height) || 1);
    const total = w * h;
    // Soft-cap: stride when pathological (>> Halo96). Preserves void/lit pattern at reduced res.
    const stride = total > MAX_MATRIX_TOPOLOGY_CELLS ? Math.ceil(Math.sqrt(total / MAX_MATRIX_TOPOLOGY_CELLS)) : 1;
    const outW = Math.ceil(w / stride);
    const outH = Math.ceil(h / stride);
    const cells: MatrixGridCell[] = [];

    for (let row = 0; row < h; row += stride) {
        const rowArr = matrix.map[row] || [];
        for (let col = 0; col < w; col += stride) {
            const cell = rowArr[col];
            if (cell === null || cell === undefined) {
                cells.push({ row: Math.floor(row / stride), col: Math.floor(col / stride), ledIndex: null, isVoid: true });
            } else {
                cells.push({
                    row: Math.floor(row / stride),
                    col: Math.floor(col / stride),
                    ledIndex: ledsStart + Number(cell),
                    isVoid: false,
                });
            }
        }
    }

    return { width: outW, height: outH, cells };
}

/**
 * Map LED index across the placement rectangle.
 * Matrix path: OpenRGB cell → ((col+0.5)/width, (row+0.5)/height).
 * Fallback when no matrix: packed cols×rows lattice (density-friendly).
 */
export function ledCanvasPoint(
    placement: LedPlacement,
    ledIndex: number,
    ledCount?: number,
    ledNorm?: Record<number, { nx: number; ny: number }>,
): { x: number; y: number } {
    const width = Math.max(1, Number(placement.width) || 1);
    const height = Math.max(1, Number(placement.height) || 1);
    const x0 = Number(placement.x) || 0;
    const y0 = Number(placement.y) || 0;
    const norm = ledNorm || placement.ledNorm;

    if (norm && norm[ledIndex]) {
        const { nx, ny } = norm[ledIndex];
        return {
            x: x0 + nx * width,
            y: y0 + ny * height,
        };
    }

    // No OpenRGB matrix for this LED — packed lattice fallback.
    const n = Math.max(1, ledCount || placement.ledCount || 1);
    const i = Math.max(0, Math.min(n - 1, ledIndex));
    const aspect = width / height;
    let cols = Math.max(1, Math.round(Math.sqrt(n * aspect)));
    cols = Math.min(n, Math.max(1, cols));
    const rows = Math.max(1, Math.ceil(n / cols));
    const col = i % cols;
    const row = Math.floor(i / cols);

    return {
        x: x0 + ((col + 0.5) / cols) * width,
        y: y0 + ((row + 0.5) / rows) * height,
    };
}

/** Evenly spaced LED indices when counting above the marker cap. */
export function ledSampleIndices(ledCount: number, maxMarkers = MAX_LED_SAMPLE_MARKERS): number[] {
    const n = Math.max(0, Math.floor(Number(ledCount) || 0));
    if (n <= 0) return [];
    if (n <= maxMarkers) {
        return Array.from({ length: n }, (_, i) => i);
    }
    const out: number[] = [];
    const seen = new Set<number>();
    for (let m = 0; m < maxMarkers; m += 1) {
        const idx = Math.round((m / (maxMarkers - 1)) * (n - 1));
        if (!seen.has(idx)) {
            seen.add(idx);
            out.push(idx);
        }
    }
    return out;
}

function subsampleEntries<T>(entries: T[], maxMarkers: number): T[] {
    if (entries.length <= maxMarkers) return entries;
    const pick = ledSampleIndices(entries.length, maxMarkers);
    return pick.map((i) => entries[i]);
}

/**
 * Matrix-aware markers: one star per non-null matrix cell at hardware coords.
 * Null cells → no marker. Full topology — no 64-cap (soft-cap only via MAX_MATRIX_TOPOLOGY_CELLS).
 */
export function ledSampleMarkersFromMatrix(
    zones?: ZoneWithMatrix[] | null,
    maxMarkers = MAX_MATRIX_TOPOLOGY_CELLS,
): Array<{ index: number; leftPct: number; topPct: number }> | null {
    const norm = ledNormFromZones(zones);
    const keys = Object.keys(norm).map(Number).sort((a, b) => a - b);
    if (!keys.length) return null;

    const entries = subsampleEntries(
        keys.map((index) => ({ index, ...norm[index] })),
        maxMarkers,
    );

    return entries.map(({ index, nx, ny }) => ({
        index,
        leftPct: nx * 100,
        topPct: ny * 100,
    }));
}

/**
 * Relative % positions inside the placement rect (for CSS left/top).
 * Uses OpenRGB matrix when zones provide one; else packed lattice + density cap.
 */
export function ledSampleMarkers(
    placement: LedPlacement,
    ledCount?: number,
    maxMarkers = MAX_LED_SAMPLE_MARKERS,
    zones?: ZoneWithMatrix[] | null,
): Array<{ index: number; leftPct: number; topPct: number }> {
    const fromMatrix = ledSampleMarkersFromMatrix(zones);
    if (fromMatrix) return fromMatrix;

    const n = Math.max(0, Math.floor(Number(ledCount ?? placement.ledCount) || 0));
    const width = Math.max(1, Number(placement.width) || 1);
    const height = Math.max(1, Number(placement.height) || 1);
    const x0 = Number(placement.x) || 0;
    const y0 = Number(placement.y) || 0;

    return ledSampleIndices(n, maxMarkers).map((index) => {
        const pt = ledCanvasPoint(placement, index, n);
        return {
            index,
            leftPct: ((pt.x - x0) / width) * 100,
            topPct: ((pt.y - y0) / height) * 100,
        };
    });
}
