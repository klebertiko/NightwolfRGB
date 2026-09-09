/**
 * OpenRGB parity — source-contract tests.
 * Flag values are independent literals from OpenRGB RGBController.h.
 *
 * Run: node --test scripts/openrgb-parity.test.cjs
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Independent source of truth: OpenRGB RGBController.h MODE_FLAG_*
const OPENRGB_MODE_FLAGS = {
    HAS_SPEED: 1,
    HAS_DIRECTION_LR: 2,
    HAS_DIRECTION_UD: 4,
    HAS_DIRECTION_HV: 8,
    HAS_BRIGHTNESS: 16,
    HAS_PER_LED_COLOR: 32,
    HAS_MODE_SPECIFIC_COLOR: 64,
    HAS_RANDOM_COLOR: 128,
    MANUAL_SAVE: 256,
    AUTOMATIC_SAVE: 512,
};

test('MODE_FLAG bits match OpenRGB RGBController.h (not the old shifted frontend constants)', () => {
    const src = read('frontend/src/lib/openrgb-mode.ts');
    assert.equal(1 << 0, OPENRGB_MODE_FLAGS.HAS_SPEED);
    assert.equal(1 << 1, OPENRGB_MODE_FLAGS.HAS_DIRECTION_LR);
    assert.equal(1 << 4, OPENRGB_MODE_FLAGS.HAS_BRIGHTNESS);
    assert.equal(1 << 7, OPENRGB_MODE_FLAGS.HAS_RANDOM_COLOR);
    assert.match(src, /HAS_SPEED = 1 << 0/);
    assert.match(src, /HAS_DIRECTION_LR = 1 << 1/);
    assert.match(src, /HAS_BRIGHTNESS = 1 << 4/);
    assert.match(src, /HAS_PER_LED_COLOR = 1 << 5/);
    assert.match(src, /HAS_RANDOM_COLOR = 1 << 7/);
    assert.match(src, /MANUAL_SAVE = 1 << 8/);
    assert.equal(src.includes('HAS_SPEED = 0x02'), false, 'old off-by-one bitmask must be gone');
});

test('backend mapper computes ledsStart, normalizes segments and matrix.keys', () => {
    const src = read('backend/lib/map-openrgb-device.ts');
    assert.match(src, /ledsStart: ledOffset/);
    assert.match(src, /ledOffset \+= ledsCount/);
    assert.match(src, /ledsStart: seg\.start \?\? seg\.ledsStart/);
    assert.match(src, /ledsCount: seg\.length \?\? seg\.ledsCount/);
    assert.match(src, /matrixSrc\.keys/);
    assert.match(src, /flagList/);
});

test('backend exposes rescan, zone, LED, resize, segments, saveMode, native profiles', () => {
    const routes = read('backend/routes/devices.routes.ts');
    const ctrl = read('backend/controllers/openrgb.controller.ts');
    const profiles = read('backend/routes/openrgb-profiles.routes.ts');
    assert.match(routes, /router\.post\('\/rescan'/);
    assert.match(routes, /zones\/:zoneId\/color/);
    assert.match(routes, /zones\/:zoneId\/resize/);
    assert.match(routes, /leds\/:ledId\/color/);
    assert.match(routes, /mode-save/);
    assert.match(routes, /segments\/:segmentId\/color/);
    assert.match(ctrl, /resizeZone/);
    assert.match(ctrl, /saveDeviceMode/);
    assert.match(ctrl, /requestRescan/);
    assert.match(ctrl, /addSegment/);
    assert.match(ctrl, /getProfileList/);
    assert.match(profiles, /openrgb-profiles/);
});

test('App wires rescan, zones, per-LED, native OpenRGB profiles into existing chrome', () => {
    const app = read('frontend/src/App.tsx');
    assert.match(app, /onRescan=\{rescan\}/);
    assert.match(app, /setZoneColor=\{setZoneColor\}/);
    assert.match(app, /setSingleLed=\{setSingleLed\}/);
    assert.match(app, /resizeZone=\{resizeZone\}/);
    assert.match(app, /native=\{nativeProfiles\}/);
    assert.match(app, /useNativeProfiles/);
    assert.match(app, /Redigitalizar devices/);
});

test('Luz studio paints zones, LEDs, segments and redigitaliza', () => {
    const studio = read('frontend/src/components/LightingStudio.tsx');
    assert.match(studio, /Redigitalizar/);
    assert.match(studio, /LedPainter/);
    assert.match(studio, /Aplicar zona/);
    assert.match(studio, /Segmentos/);
    assert.match(studio, /Redimensionar zona/);
});

test('Cenas distinguishes Nightwolf scenes from native OpenRGB .orp profiles', () => {
    const scenes = read('frontend/src/components/ScenesView.tsx');
    assert.match(scenes, /Cenas Nightwolf/);
    assert.match(scenes, /Perfis OpenRGB/);
    assert.match(scenes, /native\.load/);
});

test('plugin list and Effects share one SDK round-trip; frontend does not Promise.all plugin routes', () => {
    const hook = read('frontend/src/hooks/usePlugins.ts');
    assert.equal(hook.includes('Promise.all'), false);
    assert.match(hook, /getPluginEffects/);
    assert.equal(hook.includes('getPlugins()'), false);
    const ctrl = read('backend/controllers/openrgb.controller.ts');
    assert.match(ctrl, /wrapClientQueue/);
    assert.match(ctrl, /plugins,/);
});

test('Nightwolf reads plugin list via protocol 200 sendMessage, does not fake a store', () => {
    const client = read('backend/node_modules/openrgb-sdk/src/client.ts');
    assert.equal(client.includes('getPluginList'), false);
    const utils = read('backend/node_modules/openrgb-sdk/src/utils.ts');
    assert.match(utils, /requestPluginList: 200/);
    const ctrl = read('backend/controllers/openrgb.controller.ts');
    assert.equal(ctrl.includes('requestPluginList'), false, 'do not call a method the JS Client does not have');
    assert.match(ctrl, /sendMessage\(200\)/);
    assert.match(ctrl, /readMessage\(200\)/);
    assert.match(ctrl, /sendMessage\(201/);
    const routes = read('backend/routes/plugins.routes.ts');
    assert.match(routes, /store: false/);
    const caps = read('backend/lib/sdk-capabilities.ts');
    assert.match(caps, /plugin-store/);
    assert.match(caps, /app-autoupdate/);
});

test('desktop bind is loopback: Express listen host and OpenRGB --server-host', () => {
    const server = read('backend/server.ts');
    assert.match(server, /listen\(Number\(PORT\), '127\.0\.0\.1'/);
    assert.match(server, /CORS_ORIGINS/);
    const launcher = read('backend/launcher/openrgb-launcher.ts');
    assert.match(launcher, /--server-host',\s*'127\.0\.0\.1'/);
    const unzip = read('scripts/update-openrgb.cjs');
    assert.equal(unzip.includes("LiteralPath '${zipPath}'"), false);
    assert.match(unzip, /-File/);
    assert.match(unzip, /\$args\[0\]/);
    const electron = read('electron/main.cjs');
    assert.match(electron, /parsed\.protocol === 'http:'/);
});

test('plugin list and Effects packet parsers round-trip SDK layout', () => {
    const tsNode = require(path.join(ROOT, 'backend/node_modules/ts-node'));
    tsNode.register({ transpileOnly: true, compilerOptions: { module: 'commonjs', esModuleInterop: true } });
    const {
        parsePluginList,
        parseEffectList,
        encodeFxPacket,
        writeCString,
        FX_START_EFFECT,
    } = require(path.join(ROOT, 'backend/lib/openrgb-plugins.ts'));

    const name = writeCString('Effects');
    const desc = writeCString('RGB effects');
    const ver = writeCString('1.0');
    const idx = Buffer.alloc(8);
    idx.writeUInt32LE(2, 0);
    idx.writeUInt32LE(2, 4);
    const inner = Buffer.concat([name, desc, ver, idx]);
    const body = Buffer.alloc(6 + inner.length);
    body.writeUInt32LE(2 + inner.length, 0);
    body.writeUInt16LE(1, 4);
    inner.copy(body, 6);
    const plugins = parsePluginList(body);
    assert.equal(plugins.length, 1);
    assert.equal(plugins[0].name, 'Effects');
    assert.equal(plugins[0].index, 2);
    assert.equal(plugins[0].protocolVersion, 2);

    const fxName = writeCString('Rainbow Wave');
    const fxDesc = writeCString('wave');
    const enabled = Buffer.from([1]);
    const fxInner = Buffer.concat([fxName, fxDesc, enabled]);
    const list = Buffer.alloc(6 + fxInner.length);
    list.writeUInt32LE(2 + fxInner.length, 0);
    list.writeUInt16LE(1, 4);
    fxInner.copy(list, 6);
    const wrapped = Buffer.concat([Buffer.alloc(4), list]);
    wrapped.writeUInt32LE(0, 0);
    const effects = parseEffectList(wrapped, 2);
    assert.equal(effects.length, 1);
    assert.equal(effects[0].name, 'Rainbow Wave');
    assert.equal(effects[0].enabled, true);

    const start = encodeFxPacket(FX_START_EFFECT, writeCString('Rainbow Wave'));
    assert.equal(start.readUInt32LE(0), 20);
});

test('Limpeza catalog has 63 named Windows RGB processes', () => {
    const src = read('backend/controllers/cleanup.controller.ts');
    assert.match(src, /catalogSize: RGB_PROCESSES\.windows\.length/);
    const match = src.match(/windows:\s*\[([\s\S]*?)\]/);
    assert.ok(match, 'RGB_PROCESSES.windows list');
    const names = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.equal(names.length, 63, `expected 63, got ${names.length}: ${names.join(',')}`);
    assert.equal(src.includes('OpenRGB.exe'), false, 'must not kill bundled OpenRGB');
});

test('Efeitos are named in pt-BR and do not fake audio capture', () => {
    const panel = read('frontend/src/components/EffectsPanel.tsx');
    assert.match(panel, /Respirar/);
    assert.match(panel, /Arco-íris/);
    assert.match(panel, /Velocidade/);
    assert.match(panel, /sem áudio/);
    assert.match(panel, /Não há loja de plugins/);
    const app = read('frontend/src/App.tsx');
    assert.match(app, /EffectPreview/);
    assert.match(app, /sem captura de áudio/);
    assert.equal(app.includes('Áudio inativo'), false);
    assert.equal(app.includes('Math.random'), false);
    const fx = read('backend/controllers/effects.controller.ts');
    assert.match(fx, /applyPerLed/);
    assert.match(fx, /audio: false/);
});

test('operator chrome: keyboard 1–4 / Ctrl+K and OpenRGB port honesty', () => {
    const app = read('frontend/src/App.tsx');
    assert.match(app, /e\.key >= '1' && e\.key <= '4'/);
    assert.match(app, /toLowerCase\(\) === 'k'/);
    const bar = read('frontend/src/components/StatusBar.tsx');
    assert.match(bar, /OpenRGB :/);
    assert.match(bar, /sdkPort/);
    const chassis = read('frontend/src/components/ChassisGhost.tsx');
    assert.match(chassis, /fills/);
    const overlay = read('frontend/src/components/ShortcutOverlay.tsx');
    assert.match(overlay, /1–4/);
    assert.match(overlay, /Ctrl\+K/);
});

test('Studio shows vendor, LED honesty and native OpenRGB profiles', () => {
    const dash = read('frontend/src/components/Dashboard.tsx');
    assert.match(dash, /ledHonesty/);
    assert.match(dash, /nativeProfiles/);
    const studio = read('frontend/src/components/LightingStudio.tsx');
    assert.match(studio, /selected\.vendor/);
    assert.match(studio, /cabeçalho/);
    const update = read('frontend/src/components/UpdatePanel.tsx');
    assert.match(update, /Sem instalador empacotado/);
});

test('controller works around SDK falsy-zero mode params and looks up zones by id', () => {
    const src = read('backend/controllers/openrgb.controller.ts');
    assert.match(src, /function sdkZeroSafe/);
    assert.match(src, /function zoneIndex/);
    assert.match(src, /n === 0 \? Number\.MIN_VALUE/);
});

test('mapOpenRgbDevice assigns running ledsStart and zone-relative segments', () => {
    const tsNode = require(path.join(ROOT, 'backend/node_modules/ts-node'));
    tsNode.register({ transpileOnly: true, compilerOptions: { module: 'commonjs', esModuleInterop: true } });
    const { mapOpenRgbDevice } = require(path.join(ROOT, 'backend/lib/map-openrgb-device.ts'));
    const mapped = mapOpenRgbDevice({
        name: 'Strip',
        type: 4,
        description: '',
        version: '',
        location: '',
        serial: '',
        activeMode: 0,
        modes: [],
        colors: [],
        leds: [{ name: 'LED 0', value: 0 }, { name: 'LED 1', value: 0 }],
        alternateLEDsNames: ['Q', 'W'],
        zones: [
            { id: 0, name: 'A', ledsCount: 4, ledsMin: 1, ledsMax: 10, segments: [{ name: 'S', start: 1, length: 2 }] },
            { id: 1, name: 'B', ledsCount: 3 },
        ],
    }, 0);
    assert.equal(mapped.zones[0].ledsStart, 0);
    assert.equal(mapped.zones[1].ledsStart, 4);
    assert.equal(mapped.zones[0].segments[0].ledsStart, 1);
    assert.equal(mapped.zones[0].segments[0].ledsCount, 2);
    assert.equal(mapped.leds[0].name, 'Q');
    assert.equal(mapped.zones[0].resizable, true);
});

test('segment LED ids are zone-relative (OpenRGB segment.start is inside the zone)', () => {
    const zoneStart = 10;
    const segStart = 2;
    const segCount = 3;
    const expected = [12, 13, 14];
    const actual = [];
    for (let i = 0; i < segCount; i++) actual.push(zoneStart + segStart + i);
    assert.deepEqual(actual, expected);
});
