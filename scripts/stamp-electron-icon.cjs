#!/usr/bin/env node
'use strict';
/**
 * Windows pins the *executable* PE icon, not BrowserWindow.icon.
 * Stamp this project's electron.exe before spawn so taskbar/start pins
 * show Nightwolf, not the stock Electron atom.
 *
 * npm install restores a vanilla electron.exe — run this on every desktop launch.
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const iconIco = path.join(root, 'electron', 'icon.ico');

async function stampElectronIcon() {
    if (process.platform !== 'win32') return;
    if (!fs.existsSync(iconIco)) {
        console.warn('[stamp-electron-icon] missing electron/icon.ico — skipped');
        return;
    }
    const electronExe = require('electron');
    if (typeof electronExe !== 'string' || !fs.existsSync(electronExe)) {
        console.warn('[stamp-electron-icon] electron.exe path not found — skipped');
        return;
    }
    const { rcedit } = await import('rcedit');
    await rcedit(electronExe, {
        icon: iconIco,
        'version-string': {
            ProductName: 'Nightwolf RGB',
            FileDescription: 'Nightwolf RGB',
            CompanyName: 'Nightwolf',
            InternalName: 'NightwolfRGB',
            OriginalFilename: 'NightwolfRGB.exe',
        },
        'file-version': '1.0.0',
        'product-version': '1.0.0',
    });
}

module.exports = { stampElectronIcon };

if (require.main === module) {
    stampElectronIcon().catch((err) => {
        console.error('[stamp-electron-icon]', err.message || err);
        process.exit(1);
    });
}
