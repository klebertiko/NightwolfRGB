/**
 * Spatial canvas layout — one shared 2D surface; each device samples LEDs
 * from its placed rectangle so waves/gradients flow across the kit.
 * Pure module (no OpenRGB I/O) so unit tests can prove spatial sampling.
 */

'use strict';

const DEFAULT_CANVAS = { width: 1000, height: 600 };
const DEFAULT_DEVICE_HEIGHT = 80;
const GAP = 24;

function hslToRgb(h, s, l) {
    const hh = (((h % 360) + 360) % 360) / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (pp, qq, t) => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return pp + (qq - pp) * 6 * tt;
        if (tt < 1 / 2) return qq;
        if (tt < 2 / 3) return pp + (qq - pp) * (2 / 3 - tt) * 6;
        return pp;
    };
    return {
        red: Math.round(hue2rgb(p, q, hh + 1 / 3) * 255),
        green: Math.round(hue2rgb(p, q, hh) * 255),
        blue: Math.round(hue2rgb(p, q, hh - 1 / 3) * 255),
    };
}

function normalizeDevice(d) {
    const ledCount = Math.max(0, Number(d.ledCount ?? d.leds?.length ?? 0) || 0);
    return {
        id: String(d.id),
        name: d.name || `Device ${d.id}`,
        ledCount,
    };
}

function defaultWidthForLeds(ledCount) {
    if (ledCount <= 0) return 80;
    return Math.max(60, Math.min(320, ledCount * 4));
}

/**
 * Pack devices in a simple 2D grid so default placements have Y variety
 * (not every device pinned to one mid-line rowY).
 */
function autoLayout(devices, canvas = DEFAULT_CANVAS) {
    const canvasWidth = canvas.width || DEFAULT_CANVAS.width;
    const canvasHeight = canvas.height || DEFAULT_CANVAS.height;
    const list = (devices || []).map(normalizeDevice);
    const n = list.length;
    // Prefer enough columns to leave room for a second row when N >= 2
    const cols = Math.max(1, Math.round(Math.sqrt(Math.max(1, n))));
    const cellW = Math.max(
        80,
        Math.floor((canvasWidth - GAP * (cols + 1)) / cols),
    );
    const originY = Math.round(canvasHeight * 0.18);
    const rowStride = DEFAULT_DEVICE_HEIGHT + GAP;

    const placed = list.map((d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const width = Math.min(cellW, defaultWidthForLeds(d.ledCount));
        const height = DEFAULT_DEVICE_HEIGHT;
        const x = GAP + col * (cellW + GAP) + Math.max(0, Math.floor((cellW - width) / 2));
        const y = originY + row * rowStride;
        return {
            id: d.id,
            name: d.name,
            x,
            y: Math.min(y, Math.max(0, canvasHeight - height - GAP)),
            width,
            height,
            ledCount: d.ledCount,
        };
    });

    // Guarantee Y variety when multiple devices still landed on one row
    if (n >= 2) {
        const ys = new Set(placed.map((p) => p.y));
        if (ys.size === 1) {
            const stagger = Math.round(rowStride * 0.55);
            placed.forEach((p, i) => {
                p.y = Math.min(
                    originY + (i % 2) * stagger,
                    Math.max(0, canvasHeight - p.height - GAP),
                );
            });
        }
    }

    return {
        canvasWidth,
        canvasHeight,
        devices: placed,
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Keep saved rects for known ids; append auto-placed newcomers.
 */
function mergeLayout(saved, liveDevices) {
    const canvasWidth = saved?.canvasWidth || DEFAULT_CANVAS.width;
    const canvasHeight = saved?.canvasHeight || DEFAULT_CANVAS.height;
    const byId = new Map((saved?.devices || []).map((p) => [String(p.id), p]));
    const live = (liveDevices || []).map(normalizeDevice);
    const devices = [];
    let nextX = GAP;

    for (const d of live) {
        const prev = byId.get(d.id);
        if (prev) {
            devices.push({
                id: d.id,
                name: d.name || prev.name,
                x: Number(prev.x) || 0,
                y: Number(prev.y) || 0,
                width: Math.max(20, Number(prev.width) || defaultWidthForLeds(d.ledCount)),
                height: Math.max(20, Number(prev.height) || DEFAULT_DEVICE_HEIGHT),
                ledCount: d.ledCount,
            });
            nextX = Math.max(nextX, (Number(prev.x) || 0) + (Number(prev.width) || 0) + GAP);
        } else {
            const width = defaultWidthForLeds(d.ledCount);
            devices.push({
                id: d.id,
                name: d.name,
                x: nextX,
                y: Math.round(canvasHeight * 0.35),
                width,
                height: DEFAULT_DEVICE_HEIGHT,
                ledCount: d.ledCount,
            });
            nextX += width + GAP;
        }
    }

    return {
        canvasWidth,
        canvasHeight,
        devices,
        updatedAt: new Date().toISOString(),
    };
}

function nudgeDevice(layout, deviceId, dx, dy) {
    const id = String(deviceId);
    const devices = (layout.devices || []).map((p) => {
        if (String(p.id) !== id) return p;
        return {
            ...p,
            x: Math.max(0, (Number(p.x) || 0) + (Number(dx) || 0)),
            y: Math.max(0, (Number(p.y) || 0) + (Number(dy) || 0)),
        };
    });
    return { ...layout, devices, updatedAt: new Date().toISOString() };
}

function countNonNullMatrix(matrix) {
    let n = 0;
    for (const row of matrix.map || []) {
        for (const cell of row || []) {
            if (cell !== null && cell !== undefined) n += 1;
        }
    }
    return n;
}

/**
 * OpenRGB zone.matrix → LED index → normalized (0–1) coords.
 * Null cells are gaps (no entry). Richest matrix zone wins when several exist.
 * Keep in sync with frontend/src/lib/ledCanvasPoint.ts.
 */
function ledNormFromZones(zones) {
    const list = (zones || []).filter(
        (z) =>
            z &&
            z.matrix &&
            Number(z.matrix.width) > 0 &&
            Number(z.matrix.height) > 0 &&
            Array.isArray(z.matrix.map) &&
            z.matrix.map.length > 0,
    );
    if (!list.length) return {};

    let best = list[0];
    let bestCount = countNonNullMatrix(best.matrix);
    for (let i = 1; i < list.length; i += 1) {
        const c = countNonNullMatrix(list[i].matrix);
        if (c > bestCount) {
            best = list[i];
            bestCount = c;
        }
    }

    const matrix = best.matrix;
    const w = Math.max(1, Number(matrix.width) || 1);
    const h = Math.max(1, Number(matrix.height) || 1);
    const ledsStart = Math.max(0, Number(best.ledsStart) || 0);
    const out = {};

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
 * Map LED index across the placement rectangle.
 * Prefer OpenRGB matrix cell coords; packed lattice only when no matrix.
 */
function ledCanvasPoint(placement, ledIndex, ledCount, ledNorm) {
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

/** Soft DOM budget for matrix topology grids (Halo96 ~100; thin only above this). */
const MAX_MATRIX_TOPOLOGY_CELLS = 400;

function richestMatrixZone(zones) {
    const list = (zones || []).filter(
        (z) =>
            z &&
            z.matrix &&
            Number(z.matrix.width) > 0 &&
            Number(z.matrix.height) > 0 &&
            Array.isArray(z.matrix.map) &&
            z.matrix.map.length > 0,
    );
    if (!list.length) return null;
    let best = list[0];
    let bestCount = countNonNullMatrix(best.matrix);
    for (let i = 1; i < list.length; i += 1) {
        const c = countNonNullMatrix(list[i].matrix);
        if (c > bestCount) {
            best = list[i];
            bestCount = c;
        }
    }
    return {
        matrix: best.matrix,
        ledsStart: Math.max(0, Number(best.ledsStart) || 0),
    };
}

/**
 * Full OpenRGB matrix topology for canvas silhouette tiling.
 * Null cells are structural voids (F-row / numpad wells). No 64-cap.
 * Soft-stride only above MAX_MATRIX_TOPOLOGY_CELLS. Keep in sync with ledCanvasPoint.ts.
 */
function ledMatrixGridFromZones(zones) {
    const best = richestMatrixZone(zones);
    if (!best) return null;
    const { matrix, ledsStart } = best;
    const w = Math.max(1, Number(matrix.width) || 1);
    const h = Math.max(1, Number(matrix.height) || 1);
    const total = w * h;
    const stride = total > MAX_MATRIX_TOPOLOGY_CELLS ? Math.ceil(Math.sqrt(total / MAX_MATRIX_TOPOLOGY_CELLS)) : 1;
    const outW = Math.ceil(w / stride);
    const outH = Math.ceil(h / stride);
    const cells = [];
    for (let row = 0; row < h; row += stride) {
        const rowArr = matrix.map[row] || [];
        for (let col = 0; col < w; col += stride) {
            const cell = rowArr[col];
            if (cell === null || cell === undefined) {
                cells.push({
                    row: Math.floor(row / stride),
                    col: Math.floor(col / stride),
                    ledIndex: null,
                    isVoid: true,
                });
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

/** Markers from matrix topology (null cells → missing stars). Full topology — soft-cap only. */
function ledSampleMarkersFromMatrix(zones, maxMarkers = MAX_MATRIX_TOPOLOGY_CELLS) {
    const norm = ledNormFromZones(zones);
    const keys = Object.keys(norm)
        .map(Number)
        .sort((a, b) => a - b);
    if (!keys.length) return null;

    let pick = keys;
    if (keys.length > maxMarkers) {
        const out = [];
        const seen = new Set();
        for (let m = 0; m < maxMarkers; m += 1) {
            const idx = Math.round((m / (maxMarkers - 1)) * (keys.length - 1));
            if (!seen.has(idx)) {
                seen.add(idx);
                out.push(keys[idx]);
            }
        }
        pick = out;
    }

    return pick.map((index) => ({
        index,
        leftPct: norm[index].nx * 100,
        topPct: norm[index].ny * 100,
        nx: norm[index].nx,
        ny: norm[index].ny,
    }));
}

/**
 * Diagonal rainbow wave: hue advances with time and with both canvas X and Y
 * so devices (or LEDs) at the same X but different Y diverge in color.
 */
function sampleHorizontalRainbow(x, y, canvasWidth, timeMs, speed = 1, canvasHeight = DEFAULT_CANVAS.height) {
    const spd = Math.max(0.1, Number(speed) || 1);
    const period = 5000 / spd;
    const w = Math.max(1, Number(canvasWidth) || DEFAULT_CANVAS.width);
    const h = Math.max(1, Number(canvasHeight) || DEFAULT_CANVAS.height);
    const nx = Number(x) / w;
    const ny = Number(y) / h;
    // Diagonal / 2D field: both axes contribute independently to hue
    const hue = ((Number(timeMs) / period) * 360 + nx * 360 + ny * 360) % 360;
    return hslToRgb(hue, 1, 0.5);
}

/**
 * Sample one color per LED for a placed device.
 */
function sampleDeviceColors(
    placement,
    canvasWidth,
    timeMs,
    speed,
    sampleFn = sampleHorizontalRainbow,
    canvasHeight = DEFAULT_CANVAS.height,
) {
    const n = Math.max(0, Number(placement.ledCount) || 0);
    const ledNorm = placement.ledNorm || ledNormFromZones(placement.zones);
    const colors = [];
    for (let i = 0; i < n; i += 1) {
        const pt = ledCanvasPoint(placement, i, n, ledNorm);
        colors.push(sampleFn(pt.x, pt.y, canvasWidth, timeMs, speed, canvasHeight));
    }
    return colors;
}

/**
 * Paint every device from the shared canvas at one tick.
 * Returns [{ id, colors }] for the effects engine / tests.
 */
function paintCanvasFrame(layout, timeMs, speed = 1, sampleFn = sampleHorizontalRainbow) {
    const canvasWidth = layout?.canvasWidth || DEFAULT_CANVAS.width;
    const canvasHeight = layout?.canvasHeight || DEFAULT_CANVAS.height;
    return (layout?.devices || []).map((placement) => ({
        id: placement.id,
        colors: sampleDeviceColors(placement, canvasWidth, timeMs, speed, sampleFn, canvasHeight),
    }));
}

module.exports = {
    DEFAULT_CANVAS,
    hslToRgb,
    autoLayout,
    mergeLayout,
    nudgeDevice,
    MAX_MATRIX_TOPOLOGY_CELLS,
    ledNormFromZones,
    ledCanvasPoint,
    ledMatrixGridFromZones,
    ledSampleMarkersFromMatrix,
    sampleHorizontalRainbow,
    sampleDeviceColors,
    paintCanvasFrame,
};
