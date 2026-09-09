#!/usr/bin/env node
/**
 * Copies brand/ into the app surfaces Electron and Vite actually load.
 * Edit brand/mark.svg and brand/icon.png, then run: npm run brand
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const brand = path.join(root, 'brand');
const publicDir = path.join(root, 'frontend', 'public');
const electronDir = path.join(root, 'electron');
const derived = path.join(brand, 'derived');

function copy(src, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    console.log(`  ${path.relative(root, dest)}`);
}

function pngToIco(pngPaths) {
    const images = pngPaths.map((file) => {
        const data = fs.readFileSync(file);
        const dim = path.basename(file).match(/(\d+)/);
        const size = dim ? Number(dim[1]) : 256;
        return { size, data };
    });
    const count = images.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);
    let offset = 6 + 16 * count;
    const entries = [];
    for (const image of images) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
        entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
        entry.writeUInt8(0, 2);
        entry.writeUInt8(0, 3);
        entry.writeUInt16LE(1, 4);
        entry.writeUInt16LE(32, 6);
        entry.writeUInt32LE(image.data.length, 8);
        entry.writeUInt32LE(offset, 12);
        offset += image.data.length;
        entries.push(entry);
    }
    return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

function resizePng(src, dest, size) {
    const ps = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile('${src.replace(/\\/g, '\\\\')}')
$bmp = New-Object System.Drawing.Bitmap ${size}, ${size}
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($src, 0, 0, ${size}, ${size})
$bmp.Save('${dest.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout || 'PowerShell resize failed');
    }
}

fs.mkdirSync(publicDir, { recursive: true });
fs.mkdirSync(derived, { recursive: true });

console.log('Brand → app');
copy(path.join(brand, 'mark.svg'), path.join(publicDir, 'mark.svg'));

const iconPng = path.join(brand, 'icon.png');
if (!fs.existsSync(iconPng)) {
    console.warn('Missing brand/icon.png — skipped raster / .ico');
    process.exit(0);
}

copy(iconPng, path.join(publicDir, 'icon.png'));
copy(iconPng, path.join(electronDir, 'icon.png'));

const sizes = [16, 32, 48, 256];
const sized = sizes.map((size) => {
    const dest = path.join(derived, `icon-${size}.png`);
    resizePng(iconPng, dest, size);
    return dest;
});

const ico = pngToIco(sized);
const icoPath = path.join(electronDir, 'icon.ico');
fs.writeFileSync(icoPath, ico);
fs.writeFileSync(path.join(brand, 'icon.ico'), ico);
console.log(`  ${path.relative(root, icoPath)}`);
console.log('done');
