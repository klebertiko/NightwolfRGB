#!/usr/bin/env node
/**
 * Downloads a Windows 64-bit OpenRGB build from Codeberg into bin/OpenRGB/.
 *
 *   npm run openrgb:update
 *   npm run openrgb:update -- --tag release_candidate_1.0rc3.1
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dest = path.join(root, 'bin', 'OpenRGB');
const api = 'https://codeberg.org/api/v1/repos/OpenRGB/OpenRGB/releases?limit=12';
const args = process.argv.slice(2);
const tagIndex = args.indexOf('--tag');
const requestedTag = tagIndex >= 0 ? args[tagIndex + 1] : null;

async function main() {
    console.log('OpenRGB — fetching releases from Codeberg…');
    const releases = await (await fetch(api)).json();
    if (!Array.isArray(releases) || releases.length === 0) {
        throw new Error('No OpenRGB releases returned');
    }
    const release = requestedTag
        ? releases.find((r) => r.tag_name === requestedTag)
        : releases[0];
    if (!release) {
        throw new Error(`Tag not found: ${requestedTag}`);
    }
    const asset = (release.assets || []).find(
        (a) => /Windows_64.*\.zip$/i.test(a.name) && !/\.msi$/i.test(a.name)
    );
    if (!asset?.browser_download_url) {
        throw new Error(`No Windows 64 zip on ${release.tag_name}`);
    }

    fs.mkdirSync(dest, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nightwolf-openrgb-'));
    const zipPath = path.join(tmpDir, 'openrgb.zip');
    console.log(`Downloading ${asset.name}`);
    const zip = Buffer.from(await (await fetch(asset.browser_download_url)).arrayBuffer());
    fs.writeFileSync(zipPath, zip);

    const extractDir = path.join(tmpDir, 'out');
    fs.mkdirSync(extractDir);
    const unzipScript = path.join(tmpDir, 'unzip.ps1');
    fs.writeFileSync(
        unzipScript,
        'Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force\n',
    );
    const unzip = spawnSync(
        'powershell',
        ['-NoProfile', '-File', unzipScript, zipPath, extractDir],
        { encoding: 'utf8' }
    );
    if (unzip.status !== 0) {
        throw new Error(unzip.stderr || unzip.stdout || 'unzip failed');
    }

    const keep = new Set(['README.md']);
    for (const name of fs.readdirSync(dest)) {
        if (!keep.has(name)) fs.rmSync(path.join(dest, name), { recursive: true, force: true });
    }

    function flatten(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const onlyDir = entries.length === 1 && entries[0].isDirectory();
        return onlyDir ? path.join(dir, entries[0].name) : dir;
    }
    const payload = flatten(extractDir);
    for (const name of fs.readdirSync(payload)) {
        fs.cpSync(path.join(payload, name), path.join(dest, name), { recursive: true });
    }

    const version = {
        tag: release.tag_name,
        name: release.name,
        asset: asset.name,
        url: asset.browser_download_url,
        updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(path.join(dest, 'VERSION.json'), JSON.stringify(version, null, 2));
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const exe = fs.existsSync(path.join(dest, 'OpenRGB.exe'));
    console.log(`Installed ${release.tag_name} → bin/OpenRGB/`);
    console.log(exe ? 'OpenRGB.exe present' : 'WARNING: OpenRGB.exe not found after extract');
}

main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
});
