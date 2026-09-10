// OpenRGB Device Types
export interface RGBColor {
    red: number;
    green: number;
    blue: number;
}

export interface LEDData {
    id: number;
    name?: string;
    value: RGBColor | number;
}

export interface MatrixData {
    height: number;
    width: number;
    map: (number | null)[][];
}

export interface SegmentData {
    id: number;
    name: string;
    type: number;
    ledsCount: number;
    ledsStart: number;
}

export interface ZoneData {
    id: number;
    name: string;
    type: number;
    ledsCount: number;
    ledsStart: number;
    ledsMin: number;
    ledsMax: number;
    resizable: boolean;
    matrix: MatrixData | null;
    segments: SegmentData[];
    flags?: number;
    flagList?: string[];
}

export {
    MODE_FLAG_HAS_SPEED,
    MODE_FLAG_HAS_DIRECTION_LR,
    MODE_FLAG_HAS_DIRECTION_UD,
    MODE_FLAG_HAS_DIRECTION_HV,
    MODE_FLAG_HAS_BRIGHTNESS,
    MODE_FLAG_HAS_PER_LED_COLOR,
    MODE_FLAG_HAS_MODE_SPECIFIC_COLOR,
    MODE_FLAG_HAS_RANDOM_COLOR,
    MODE_FLAG_MANUAL_SAVE,
    MODE_FLAG_AUTOMATIC_SAVE,
} from '../lib/openrgb-mode';

export interface ModeData {
    id: number;
    name: string;
    value: number;
    flags: number;
    flagList?: string[];
    colorMode?: number;
    speed_min?: number;
    speed_max?: number;
    brightness_min?: number;
    brightness_max?: number;
    colors_min?: number;
    colors_max?: number;
    speed?: number;
    brightness?: number;
    direction?: number;
    colors?: RGBColor[];
}

export interface DeviceData {
    id: number;
    name: string;
    vendor?: string;
    type: string | number;
    description?: string;
    version?: string;
    serial?: string;
    location?: string;
    modes: ModeData[];
    colors: RGBColor[];
    leds: LEDData[];
    zones: ZoneData[];
    activeMode: number;
    ledCount: number;
    flags?: number;
    flagList?: string[];
}

// Profile Types
export interface ProfileDeviceConfig {
    id: number;
    name: string;
    color: RGBColor;
    mode: number;
    brightness: number;
}

export interface Profile {
    id: string;
    name: string;
    description: string;
    devices: ProfileDeviceConfig[];
    createdAt: string;
    updatedAt: string;
}

// API Response Types
export interface StatusResponse {
    connected: boolean;
    deviceCount: number;
    devices?: DeviceData[];
}

export interface SetColorRequest {
    color: string | RGBColor;
}

export interface SetModeRequest {
    modeId: number;
}

export interface SetBrightnessRequest {
    brightness: number;
}

export interface SyncRequest {
    color: string;
}

export interface CreateProfileRequest {
    name: string;
    description?: string;
}

// WebSocket Message Types
export type WebSocketMessageType = 'status' | 'update' | 'error';

export interface WebSocketMessage {
    type: WebSocketMessageType;
    data: any;
}

export interface WebSocketStatusData {
    connected: boolean;
    deviceCount: number;
    devices?: DeviceData[];
    sdkPort?: number;
    protocolVersion?: number | null;
}

export interface WebSocketUpdateData {
    deviceId: number;
    property: string;
    value: any;
}

export interface WebSocketErrorData {
    message: string;
    code?: string;
}

// Cleanup Types
export interface CleanupDetection {
    detected: boolean;
    count?: number;
    processes?: string[];
    message: string;
}

export interface CleanupResult {
    success: boolean;
    killed?: number;
    failed?: number;
    processesKilled?: string[];
    processesFailed?: string[];
    details?: any[];
    message: string;
}

export interface OpenRgbPlugin {
    name: string;
    description: string;
    version: string;
    index: number;
    protocolVersion: number;
}

export interface PluginEffect {
    name: string;
    description: string;
    enabled: boolean;
}

export interface PluginEffectsResponse {
    available: boolean;
    plugin: OpenRgbPlugin | null;
    plugins?: OpenRgbPlugin[];
    effects: PluginEffect[];
    reason?: string;
}

export interface PluginsResponse {
    plugins: OpenRgbPlugin[];
    protocolVersion: number | null;
    store: boolean;
    note: string;
}

export interface CleanupStatus {
    platform: string;
    supported: boolean;
    catalogSize?: number;
    detection?: CleanupDetection;
    recommendations?: string;
}

export interface FullCleanupResult {
    success: boolean;
    detection: CleanupDetection;
    processKill: CleanupResult;
    serviceStop: any;
    summary: {
        processesDetected: number;
        processesKilled: number;
        timestamp: string;
    };
}

export interface UpdateStatus {
    appVersion: string;
    appUpdate: {
        available: boolean;
        version: string | null;
        notes: string | null;
    };
    openRgb: {
        installed: boolean;
        tag: string | null;
        asset: string | null;
        updatedAt: string | null;
    };
}

// Native OpenRGB Profiles (saved as .orp files by OpenRGB itself)
export interface NativeProfilesResponse {
    profiles: string[];
}

// Mode-params request
export interface SetModeParamsRequest {
    modeId: number;
    speed?: number;
    brightness?: number;
    direction?: number;
    colors?: RGBColor[];
    colorMode?: number;
}

// Engine Types
export interface EngineState {
    enabled: boolean;
    activeSceneId: string | null;
}

export interface ApplyProfileResult {
    success: boolean;
    toggledOff?: boolean;
    engine: EngineState;
    results?: unknown;
}

/** Spatial canvas layout — devices occupy rectangles on a shared 2D surface. */
export interface CanvasDevicePlacement {
    id: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    ledCount: number;
}

export interface CanvasLayout {
    canvasWidth: number;
    canvasHeight: number;
    devices: CanvasDevicePlacement[];
    updatedAt?: string;
}
