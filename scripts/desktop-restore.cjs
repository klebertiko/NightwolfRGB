'use strict';
/**
 * Bring the desktop window back. A destroyed handle after close must create
 * a new window — returning early is why the Start Menu / taskbar do nothing.
 *
 * @param {null|{ isDestroyed?: () => boolean, isMinimized?: () => boolean, restore?: () => void, show: () => void, focus: () => void }} win
 * @param {{ create: () => void }} deps
 * @returns {'shown'|'created'}
 */
function restoreOrCreateWindow(win, { create }) {
    if (win && typeof win.isDestroyed === 'function' && !win.isDestroyed()) {
        if (typeof win.isMinimized === 'function' && win.isMinimized()) {
            win.restore();
        }
        win.show();
        win.focus();
        return 'shown';
    }
    create();
    return 'created';
}

module.exports = { restoreOrCreateWindow };
