function createLightingEngine() {
    let enabled = true;
    let activeSceneId = null;

    function status() {
        return { enabled, activeSceneId };
    }

    function assertEnabled() {
        if (enabled) return;
        const err = new Error('Controle RGB desligado');
        err.code = 'ENGINE_OFF';
        throw err;
    }

    return {
        status,
        isEnabled: () => enabled,
        assertEnabled,
        setEnabled(next) {
            enabled = Boolean(next);
            if (!enabled) activeSceneId = null;
            return status();
        },
        applyScene(id) {
            assertEnabled();
            const key = String(id);
            if (activeSceneId === key) {
                activeSceneId = null;
                return { ...status(), toggledOff: true };
            }
            activeSceneId = key;
            return { ...status(), toggledOff: false };
        },
        clearScene() {
            activeSceneId = null;
            return status();
        },
    };
}

module.exports = {
    createLightingEngine,
    engine: createLightingEngine(),
};
