// OpenRGB Device Types
export interface RGBColor {
    red: number;
    green: number;
    blue: number;
}

export interface LEDData {
    value: RGBColor;
}

export interface ModeData {
    id: number;
    name: string;
    value: number;
    flags: number;
    speed_min?: number;
    speed_max?: number;
    brightness_min?: number;
    brightness_max?: number;
    colors_min?: number;
    colors_max?: number;
    speed?: number;
    brightness?: number;
    direction?: number;
    color_mode?: number;
    colors?: RGBColor[];
}

export interface DeviceData {
    id: number;
    name: string;
    vendor?: string;
    type: string;
    description?: string;
    version?: string;
    serial?: string;
    location?: string;
    modes: ModeData[];
    colors: RGBColor[];
    leds: LEDData[];
    activeMode: number;
    ledCount: number;
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

export interface CleanupStatus {
    platform: string;
    supported: boolean;
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
