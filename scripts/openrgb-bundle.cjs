const fs = require('fs');
const path = require('path');

function exeName() {
    if (process.platform === 'win32') return 'OpenRGB.exe';
    if (process.platform === 'darwin') return 'openrgb-macos';
    return 'openrgb-linux';
}

function inventory(root) {
    const dest = path.join(root, 'bin', 'OpenRGB');
    const exe = path.join(dest, exeName());
    const versionFile = path.join(dest, 'VERSION.json');
    let version = null;
    try {
        version = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
    } catch {
        version = null;
    }
    return {
        installed: fs.existsSync(exe),
        exe,
        tag: version && version.tag ? version.tag : null,
        asset: version && version.asset ? version.asset : null,
        updatedAt: version && version.updatedAt ? version.updatedAt : null,
    };
}

module.exports = { inventory, exeName };
