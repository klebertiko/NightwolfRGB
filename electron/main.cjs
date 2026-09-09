const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const { quitDesktop } = require('../scripts/desktop-shutdown.cjs');
const { freePorts } = require('../scripts/free-desktop-ports.cjs');
const { restoreOrCreateWindow } = require('../scripts/desktop-restore.cjs');

const isDev = !app.isPackaged;
const BACKEND_PORT = Number(process.env.SERVER_PORT || 3001);
const DEV_URL = process.env.NIGHTWOLF_DEV_URL || 'http://127.0.0.1:5173';

if (isDev) {
    app.commandLine.appendSwitch('remote-debugging-port', '9229');
}

let mainWindow = null;
let backendProcess = null;

/** Prevents double-quit when both the IPC handler and the close event fire. */
let quitting = false;

/**
 * Kills the backend process tree, frees Nightwolf ports, then exits Electron.
 * Safe to call from multiple code paths — the quitting flag blocks re-entry.
 */
function initiateQuit() {
    if (quitting) return;
    quitting = true;
    const hardExit = setTimeout(() => app.exit(0), 6000);
    quitDesktop({
        backendPid: backendProcess?.pid ?? null,
        spawn,
        exit: (code) => {
            clearTimeout(hardExit);
            app.exit(code);
        },
        freePorts,
    }).catch((err) => {
        console.error('Nightwolf desktop shutdown error:', err);
        clearTimeout(hardExit);
        app.exit(1);
    });
}

app.setName('Nightwolf RGB');
if (process.platform === 'win32') {
    app.setAppUserModelId('com.nightwolf.rgb');
}

function windowsIconPath() {
    const ico = path.join(__dirname, 'icon.ico');
    const png = path.join(__dirname, 'icon.png');
    if (fs.existsSync(ico)) return ico;
    if (fs.existsSync(png)) return png;
    return undefined;
}

/** Start Menu .lnk with the same AUMID — Windows uses this icon/name when pinning. */
function ensureWindowsShortcut() {
    if (process.platform !== 'win32') return;
    const icon = windowsIconPath();
    if (!icon) return;
    const shortcutPath = path.join(
        app.getPath('appData'),
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
        'Nightwolf RGB.lnk',
    );
    const appPath = app.getAppPath();
    fs.mkdirSync(path.dirname(shortcutPath), { recursive: true });
    const operation = fs.existsSync(shortcutPath) ? 'replace' : 'create';
    const ok = shell.writeShortcutLink(shortcutPath, operation, {
        target: app.getPath('exe'),
        args: app.isPackaged ? '' : `"${appPath}"`,
        cwd: app.isPackaged ? path.dirname(app.getPath('exe')) : appPath,
        appUserModelId: 'com.nightwolf.rgb',
        icon,
        iconIndex: 0,
        description: 'Nightwolf RGB',
    });
    if (!ok) console.warn('Nightwolf: could not write Start Menu shortcut');
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        restoreOrCreateWindow(mainWindow, { create: createWindow });
    });
}

function portOpen(port) {
    return new Promise((resolve) => {
        const socket = net.connect({ port, host: '127.0.0.1' }, () => {
            socket.end();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
    });
}

function waitForHttp(url, timeoutMs = 45000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const req = http.get(url, (res) => {
                res.resume();
                resolve();
            });
            req.on('error', () => {
                if (Date.now() - started > timeoutMs) {
                    reject(new Error(`Timeout waiting for ${url}`));
                    return;
                }
                setTimeout(attempt, 400);
            });
        };
        attempt();
    });
}

function startBackend() {
    if (backendProcess) return;
    const backendDir = path.join(__dirname, '..', 'backend');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = isDev ? ['run', 'dev'] : ['run', 'start'];
    backendProcess = spawn(npmCmd, args, {
        cwd: backendDir,
        stdio: 'inherit',
        shell: false,
        windowsHide: true,
        env: { ...process.env, FORCE_COLOR: '1' },
    });
    backendProcess.on('exit', (code) => {
        backendProcess = null;
        if (code && code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
            console.error(`Nightwolf backend exited with code ${code}`);
        }
    });
}

async function ensureBackend() {
    if (await portOpen(BACKEND_PORT)) return;
    startBackend();
    await waitForHttp(`http://127.0.0.1:${BACKEND_PORT}/api/status`);
}

function getWindow() {
    return BrowserWindow.getFocusedWindow() || mainWindow;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1100,
        minHeight: 720,
        backgroundColor: '#0c0b0a',
        show: false,
        frame: false,
        autoHideMenuBar: true,
        title: 'Nightwolf RGB',
        icon: windowsIconPath(),
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
        trafficLightPosition: { x: 14, y: 11 },
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    const iconPath = windowsIconPath();
    if (iconPath) mainWindow.setIcon(iconPath);

    Menu.setApplicationMenu(null);

    const reveal = () => {
        if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
        mainWindow.show();
        const [width, height] = mainWindow.getSize();
        mainWindow.setSize(width, height - 1);
        mainWindow.setSize(width, height);
    };
    mainWindow.once('ready-to-show', reveal);
    setTimeout(reveal, 2500);

    mainWindow.on('close', (event) => {
        if (quitting) return;
        // Keep the HWND until app.exit so the taskbar / Start Menu can restore
        // instead of grouping a lock-holder with no window.
        event.preventDefault();
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
        initiateQuit();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                shell.openExternal(url);
            }
        } catch {
            /* ignore invalid URLs */
        }
        return { action: 'deny' };
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, description, url) => {
        console.error(`Nightwolf renderer failed to load (${errorCode}) ${description} ${url}`);
        if (!isDev || errorCode === -3 || !mainWindow || mainWindow.isDestroyed()) return;
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(DEV_URL);
        }, 800);
    });

    mainWindow.webContents.on('console-message', (_event, _level, message) => {
        console.log(`[renderer] ${message}`);
    });

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.type !== 'keyDown') return;
        const reload = input.key === 'F5' || ((input.control || input.meta) && input.key.toLowerCase() === 'r');
        if (!reload || !mainWindow || mainWindow.isDestroyed()) return;
        event.preventDefault();
        mainWindow.webContents.reloadIgnoringCache();
    });

    if (isDev) {
        mainWindow.loadURL(DEV_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
    }
}

ipcMain.on('window:minimize', () => getWindow()?.minimize());
ipcMain.on('window:maximize', () => {
    const win = getWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
});
ipcMain.on('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
    initiateQuit();
});

app.whenReady().then(async () => {
    try {
        await ensureBackend();
        if (isDev) await waitForHttp(DEV_URL);
    } catch (error) {
        console.error('Nightwolf desktop failed to start services:', error);
    }
    ensureWindowsShortcut();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    // On macOS apps conventionally stay alive until Cmd+Q.
    // On Windows/Linux, closing the last window should quit.
    if (process.platform !== 'darwin') initiateQuit();
});
