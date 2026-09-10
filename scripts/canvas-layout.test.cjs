const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    autoLayout,
    mergeLayout,
    nudgeDevice,
    ledCanvasPoint,
    ledNormFromZones,
    ledMatrixGridFromZones,
    ledSampleMarkersFromMatrix,
    MAX_MATRIX_TOPOLOGY_CELLS,
    sampleHorizontalRainbow,
    sampleDeviceColors,
    paintCanvasFrame,
} = require('./canvas-layout.cjs');

test('autoLayout places devices side-by-side with distinct x', () => {
    const layout = autoLayout([
        { id: 0, name: 'KB', ledCount: 20 },
        { id: 1, name: 'Mouse', ledCount: 8 },
    ]);
    assert.equal(layout.devices.length, 2);
    assert.ok(
        layout.devices[1].x !== layout.devices[0].x ||
            layout.devices[1].y !== layout.devices[0].y,
        'devices must not occupy the same origin',
    );
    assert.equal(layout.devices[0].ledCount, 20);
});

test('autoLayout gives multiple devices distinct Y (not one shared rowY)', () => {
    const layout = autoLayout([
        { id: 0, name: 'KB', ledCount: 40 },
        { id: 1, name: 'Mouse', ledCount: 8 },
        { id: 2, name: 'Fan', ledCount: 12 },
    ]);
    const ys = new Set(layout.devices.map((d) => d.y));
    assert.ok(ys.size >= 2, 'autoLayout must not pin every device to identical Y');
});

test('LEDs in one tall placement sample different Y and diverge in color', () => {
    // Tall keyboard-like rect: 2D grid must place LEDs on different rows
    const placement = {
        id: 'halo',
        x: 100,
        y: 50,
        width: 120,
        height: 240,
        ledCount: 16,
    };
    const tick = 0;
    const speed = 1;
    const canvasWidth = 1000;
    const canvasHeight = 600;

    const topPt = ledCanvasPoint(placement, 0, 16);
    const botPt = ledCanvasPoint(placement, 15, 16);
    assert.ok(
        Math.abs(botPt.y - topPt.y) > 1,
        'LED indices in a tall placement must map to different canvas Y',
    );

    const colors = sampleDeviceColors(placement, canvasWidth, tick, speed, sampleHorizontalRainbow, canvasHeight);
    assert.notDeepEqual(
        colors[0],
        colors[15],
        'same placement, different mapped Y → different colors at same tick',
    );
});

test('two devices at different x get different colors at the same tick', () => {
    const layout = {
        canvasWidth: 1000,
        canvasHeight: 600,
        devices: [
            { id: 'left', name: 'Left', x: 0, y: 200, width: 100, height: 60, ledCount: 4 },
            { id: 'right', name: 'Right', x: 700, y: 200, width: 100, height: 60, ledCount: 4 },
        ],
    };
    const tick = 0;
    const speed = 1;
    const frames = paintCanvasFrame(layout, tick, speed);
    assert.equal(frames.length, 2);

    const leftMid = frames[0].colors[Math.floor(frames[0].colors.length / 2)];
    const rightMid = frames[1].colors[Math.floor(frames[1].colors.length / 2)];

    assert.notDeepEqual(
        leftMid,
        rightMid,
        'spatial sampling must diverge by canvas X at the same tick',
    );

    // Independent check: sample at the two midpoints directly
    const leftPt = ledCanvasPoint(layout.devices[0], 1, 4);
    const rightPt = ledCanvasPoint(layout.devices[1], 1, 4);
    assert.ok(leftPt.x < rightPt.x);
    const a = sampleHorizontalRainbow(leftPt.x, leftPt.y, 1000, tick, speed);
    const b = sampleHorizontalRainbow(rightPt.x, rightPt.y, 1000, tick, speed);
    assert.notDeepEqual(a, b);
});

test('LEDs within one device span different canvas X and can differ in color', () => {
    const placement = { id: 'strip', x: 0, y: 100, width: 400, height: 40, ledCount: 8 };
    const colors = sampleDeviceColors(placement, 1000, 0, 1);
    assert.equal(colors.length, 8);
    assert.notDeepEqual(colors[0], colors[7]);
});

test('same X different Y yields different colors — Y is load-bearing', () => {
    const canvasWidth = 1000;
    const canvasHeight = 600;
    const tick = 0;
    const speed = 1;
    const layout = {
        canvasWidth,
        canvasHeight,
        devices: [
            { id: 'top', name: 'Top', x: 400, y: 40, width: 100, height: 50, ledCount: 4 },
            { id: 'bot', name: 'Bot', x: 400, y: 480, width: 100, height: 50, ledCount: 4 },
        ],
    };
    const frames = paintCanvasFrame(layout, tick, speed);
    const topMid = frames[0].colors[Math.floor(frames[0].colors.length / 2)];
    const botMid = frames[1].colors[Math.floor(frames[1].colors.length / 2)];

    assert.equal(layout.devices[0].x, layout.devices[1].x, 'fixture: same X');
    assert.notEqual(layout.devices[0].y, layout.devices[1].y, 'fixture: different Y');
    assert.notDeepEqual(
        topMid,
        botMid,
        'spatial sampling must diverge by canvas Y at the same tick (same X)',
    );

    const topPt = ledCanvasPoint(layout.devices[0], 1, 4);
    const botPt = ledCanvasPoint(layout.devices[1], 1, 4);
    assert.ok(Math.abs(topPt.x - botPt.x) < 1e-6, 'mid LEDs share X');
    assert.ok(topPt.y < botPt.y);
    const a = sampleHorizontalRainbow(topPt.x, topPt.y, canvasWidth, tick, speed, canvasHeight);
    const b = sampleHorizontalRainbow(botPt.x, botPt.y, canvasWidth, tick, speed, canvasHeight);
    assert.notDeepEqual(a, b);
});

test('nudgeDevice moves only the targeted placement', () => {
    const base = autoLayout([
        { id: 'a', ledCount: 10 },
        { id: 'b', ledCount: 10 },
    ]);
    const next = nudgeDevice(base, 'a', 40, 0);
    assert.equal(next.devices[0].x, base.devices[0].x + 40);
    assert.equal(next.devices[1].x, base.devices[1].x);
});

test('mergeLayout keeps saved positions and adds newcomers', () => {
    const saved = {
        canvasWidth: 1000,
        canvasHeight: 600,
        devices: [{ id: '0', name: 'Old', x: 120, y: 90, width: 200, height: 70, ledCount: 12 }],
    };
    const merged = mergeLayout(saved, [
        { id: 0, name: 'Keyboard', ledCount: 16 },
        { id: 1, name: 'Fan', ledCount: 6 },
    ]);
    assert.equal(merged.devices[0].x, 120);
    assert.equal(merged.devices[0].ledCount, 16);
    assert.equal(merged.devices.length, 2);
    assert.ok(merged.devices[1].x > merged.devices[0].x);
});

test('matrix null hole yields no marker; non-null LED gets expected normalized coords', () => {
    // 2×3 matrix with a center-top hole (typical F-row / numpad gap)
    const zones = [
        {
            ledsStart: 0,
            matrix: {
                height: 2,
                width: 3,
                map: [
                    [0, null, 1],
                    [2, 3, 4],
                ],
            },
        },
    ];
    const norm = ledNormFromZones(zones);
    assert.equal(Object.keys(norm).length, 5, 'null cell must not produce a LED entry');
    assert.equal(norm[0]?.nx, (0 + 0.5) / 3);
    assert.equal(norm[0]?.ny, (0 + 0.5) / 2);
    assert.equal(norm[1]?.nx, (2 + 0.5) / 3);
    assert.equal(norm[1]?.ny, (0 + 0.5) / 2);
    assert.ok(!norm[99], 'no phantom LED at the hole');

    const markers = ledSampleMarkersFromMatrix(zones);
    assert.ok(markers);
    assert.equal(markers.length, 5);
    const indices = new Set(markers.map((m) => m.index));
    assert.ok(indices.has(0) && indices.has(1) && indices.has(4));
    assert.ok(![...indices].some((i) => i === null));

    const holeLeftPct = ((1 + 0.5) / 3) * 100;
    assert.ok(
        !markers.some((m) => Math.abs(m.leftPct - holeLeftPct) < 1e-6 && Math.abs(m.topPct - 25) < 1e-6),
        'no star at the null matrix cell',
    );

    const placement = { id: 'kb', x: 100, y: 50, width: 300, height: 200, ledCount: 5, ledNorm: norm };
    const pt0 = ledCanvasPoint(placement, 0, 5);
    assert.ok(Math.abs(pt0.x - (100 + ((0.5) / 3) * 300)) < 1e-6);
    assert.ok(Math.abs(pt0.y - (50 + ((0.5) / 2) * 200)) < 1e-6);
});

test('matrix grid renders null cells as structural voids, not omitted markers only', () => {
    const zones = [
        {
            ledsStart: 0,
            matrix: {
                height: 2,
                width: 3,
                map: [
                    [0, null, 1],
                    [2, 3, 4],
                ],
            },
        },
    ];
    const grid = ledMatrixGridFromZones(zones);
    assert.ok(grid, 'matrix grid must be produced when OpenRGB matrix exists');
    assert.equal(grid.width, 3);
    assert.equal(grid.height, 2);
    assert.equal(grid.cells.length, 6, 'full topology — every matrix cell is present');
    const voids = grid.cells.filter((c) => c.isVoid);
    const lit = grid.cells.filter((c) => !c.isVoid);
    assert.equal(voids.length, 1, 'null cell is a structural void');
    assert.equal(voids[0].row, 0);
    assert.equal(voids[0].col, 1);
    assert.equal(voids[0].ledIndex, null);
    assert.equal(lit.length, 5);
    assert.ok(lit.every((c) => typeof c.ledIndex === 'number'));
    assert.ok(
        MAX_MATRIX_TOPOLOGY_CELLS >= 400,
        'matrix topology soft-cap is far above lattice 64 (documented DOM budget)',
    );
});

test('matrix grid does not thin Halo96-scale boards to 64 cells', () => {
    // 18×6 = 108 cells with a few F-row / numpad-style holes — under soft-cap, full grid
    const width = 18;
    const height = 6;
    const map = [];
    let led = 0;
    for (let r = 0; r < height; r += 1) {
        const row = [];
        for (let c = 0; c < width; c += 1) {
            // punch multi-cell voids: F-row gap cols 4–5 on row 0; numpad well cols 15–17 rows 2–3
            if (r === 0 && (c === 4 || c === 5)) row.push(null);
            else if ((r === 2 || r === 3) && c >= 15) row.push(null);
            else {
                row.push(led);
                led += 1;
            }
        }
        map.push(row);
    }
    const grid = ledMatrixGridFromZones([{ ledsStart: 0, matrix: { width, height, map } }]);
    assert.ok(grid);
    assert.equal(grid.cells.length, width * height, 'no 64-subsample on matrix topology');
    assert.ok(grid.cells.length > 64);
    const voidCount = grid.cells.filter((c) => c.isVoid).length;
    assert.equal(voidCount, 2 + 6, 'F-row + numpad wells remain multi-cell voids');
});

test('matrix path prefers richest zone; lattice still used when zones have no matrix', () => {
    const zones = [
        {
            ledsStart: 0,
            matrix: {
                height: 1,
                width: 2,
                map: [[0, 1]],
            },
        },
        {
            ledsStart: 10,
            matrix: {
                height: 2,
                width: 2,
                map: [
                    [0, 1],
                    [2, null],
                ],
            },
        },
    ];
    const norm = ledNormFromZones(zones);
    assert.ok(norm[10], 'richest zone (3 cells) wins — ledsStart 10');
    assert.ok(norm[12]);
    assert.ok(!norm[0], 'smaller matrix zone discarded when another is richer');

    const lattice = ledCanvasPoint({ x: 0, y: 0, width: 100, height: 50, ledCount: 4 }, 1, 4);
    assert.ok(lattice.x > 0 && lattice.x < 100);

    assert.equal(ledMatrixGridFromZones([{ ledsCount: 4 }]), null, 'no matrix → no topology grid');
});
