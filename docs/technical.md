# 🔧 Nightwolf RGB - Technical Documentation

## Table of Contents
1. [Architecture Deep Dive](#architecture-deep-dive)
2. [RGB Cleanup Technical Details](#rgb-cleanup-technical-details)
3. [API Specification](#api-specification)
4. [WebSocket Protocol](#websocket-protocol)
5. [Color Management](#color-management)
6. [Profile Storage Format](#profile-storage-format)
7. [OpenRGB SDK Integration](#openrgb-sdk-integration)
8. [Security Considerations](#security-considerations)

---

## Architecture Deep Dive

### System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  React Frontend (Port 5173)                         │  │
│  │  • Components (UI)                                  │  │
│  │  • Hooks (State Management)                         │  │
│  │  • API Client (Axios)                               │  │
│  │  • WebSocket Client                                 │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────┘
                        │ HTTP REST + WebSocket
                        │ (JSON over TCP)
┌───────────────────────▼───────────────────────────────────┐
│                   SERVER LAYER                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Express Backend (Port 3001)                        │  │
│  │  • REST API Routes                                  │  │
│  │  • WebSocket Server (ws)                            │  │
│  │  • Controllers (Business Logic)                     │  │
│  │  • File-based Storage (JSON)                        │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────┘
                        │ OpenRGB SDK Protocol
                        │ (Binary over TCP - Port 6742)
┌───────────────────────▼───────────────────────────────────┐
│                  HARDWARE LAYER                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  OpenRGB SDK Server (Port 6742)                     │  │
│  │  • Device Discovery                                 │  │
│  │  • Protocol Translation                             │  │
│  │  • Hardware Communication                           │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────┬───────────────────────────────────┘
                        │ USB / I2C / SMBus
┌───────────────────────▼───────────────────────────────────┐
│                  PHYSICAL DEVICES                          │
│  • Motherboard RGB Headers                                │
│  • RAM Modules (DDR4/DDR5)                                │
│  • AIO Coolers / Fans                                     │
│  • GPU RGB                                                │
│  • LED Strips                                             │
│  • Peripherals (via OpenRGB support)                      │
└───────────────────────────────────────────────────────────┘
```

### Component Communication Flow

**Color Change Example:**

1. User clicks color in UI → React component
2. Component calls `handleColorChange(color)` → Local state update
3. Hook `useDevices.setColor(deviceId, color)` → API call
4. Axios POST `/api/devices/:id/color` → HTTP request
5. Express route handler → Validates request
6. `openrgb.controller.setDeviceColor()` → Business logic
7. `openrgb-sdk` library → Binary protocol conversion
8. TCP packet to OpenRGB (port 6742) → Network
9. OpenRGB processes command → Hardware driver
10. USB/I2C command to device → Physical change
11. Response flows back up the chain
12. WebSocket broadcasts update → All connected clients

**Latency:** Typical end-to-end: **50-150ms**

---

## RGB Cleanup Technical Details

### Detection Mechanism

```javascript
// Pseudo-code algorithm
async function detectConflictingProcesses() {
  // 1. Execute Windows tasklist command
  const output = await exec('tasklist /FO CSV /NH');
  
  // 2. Parse CSV output (process names)
  const runningProcesses = parseCSV(output);
  
  // 3. Cross-reference with known RGB processes
  const conflicts = RGB_PROCESSES.filter(rgbProcess => 
    runningProcesses.some(running => 
      running.toLowerCase().includes(rgbProcess.toLowerCase())
    )
  );
  
  return conflicts;
}
```

### Process Termination

**Methods Used:**

1. **Graceful Termination** (Preferred):
   ```bash
   taskkill /IM "processname.exe"
   ```

2. **Force Kill** (If graceful fails):
   ```bash
   taskkill /F /IM "processname.exe"
   ```

3. **Tree Kill** (Process + children):
   ```bash
   taskkill /F /IM "processname.exe" /T
   ```

### Service Management

**Windows Services Targeted:**

```javascript
const RGB_SERVICES = [
  'ArmouryCrateControlInterface',  // ASUS
  'AsusHalSensor',                 // ASUS Hardware
  'CorsairService',                // Corsair
  'RzSDKService',                  // Razer SDK
  'RzActionSvc',                   // Razer Actions
  'CAMService'                     // NZXT
];
```

**Stop Command:**
```bash
net stop "ServiceName"
```

**⚠️ Note:** Requires **Administrator privileges** for service control.

### Why 70+ Processes?

Each RGB software manufacturer typically installs multiple components:

- **Main Application** (User interface)
- **Background Service** (Always running)
- **SDK Service** (For third-party integrations)
- **Update Service** (Auto-updates)
- **Monitoring Service** (Hardware monitoring)
- **Helper Processes** (Per-device helpers)

**Example - ASUS Ecosystem:**
- ArmouryCrate.Service
- ArmouryCrate.UserSessionHelper
- ArmourySocketServer
- AsusSystemAnalysis
- AsusSystemDiagnosis
- AsusCertService
- AuraService
- LightingService
- AsusUpdateCheck
- GameVisual

That's **10 processes** from one manufacturer!

---

## API Specification

### REST Endpoints

#### GET /api/status
**Description:** Get OpenRGB connection status  
**Response:**
```json
{
  "connected": true,
  "deviceCount": 5,
  "devices": [
    { "id": 0, "name": "ASUS ROG STRIX Z790", "type": "Motherboard" },
    { "id": 1, "name": "Corsair Dominator 64GB", "type": "DRAM" }
  ]
}
```

#### GET /api/devices
**Description:** List all detected RGB devices  
**Response:**
```json
[
  {
    "id": 0,
    "name": "ASUS ROG STRIX Z790",
    "type": "Motherboard",
    "vendor": "ASUS",
    "modes": [...],
    "activeMode": 0,
    "leds": [...],
    "colors": [...],
    "ledCount": 24
  }
]
```

#### POST /api/devices/:id/color
**Description:** Set device color  
**Request Body:**
```json
{
  "color": "#3b82f6"  // Hex color
}
```
**Response:**
```json
{
  "success": true,
  "deviceId": 0,
  "color": { "red": 59, "green": 130, "blue": 246 }
}
```

#### POST /api/devices/sync
**Description:** Sync all devices to same color  
**Request Body:**
```json
{
  "color": "#ff0000"
}
```
**Response:**
```json
[
  { "success": true, "deviceId": 0 },
  { "success": true, "deviceId": 1 },
  { "success": true, "deviceId": 2 }
]
```

#### POST /api/cleanup/full
**Description:** Execute complete RGB cleanup  
**Response:**
```json
{
  "success": true,
  "detection": {
    "detected": true,
    "count": 8,
    "processes": ["iCUE.exe", "ArmouryCrate.Service.exe", ...]
  },
  "processKill": {
    "killed": 8,
    "failed": 0,
    "processesKilled": ["iCUE", "ArmouryCrate.Service", ...]
  },
  "serviceStop": {
    "results": [...]
  },
  "summary": {
    "processesDetected": 8,
    "processesKilled": 8,
    "timestamp": "2026-01-14T23:15:00.000Z"
  }
}
```

---

## WebSocket Protocol

### Connection

```javascript
// Client
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('Connected');
};
```

### Message Format

All messages are JSON:

```json
{
  "type": "status|update|error",
  "data": { ... }
}
```

### Message Types

#### 1. Status Update
Server → Client (on connection)
```json
{
  "type": "status",
  "data": {
    "connected": true,
    "deviceCount": 5,
    "devices": [...]
  }
}
```

#### 2. Device Update
Server → All Clients (on any device change)
```json
{
  "type": "update",
  "data": {
    "deviceId": 0,
    "property": "color",
    "value": { "red": 255, "green": 0, "blue": 0 }
  }
}
```

#### 3. Error
Server → Client
```json
{
  "type": "error",
  "data": {
    "message": "Device not found",
    "code": "DEVICE_NOT_FOUND"
  }
}
```

### Broadcast Mechanism

When a client makes a change:
1. HTTP POST updates the device
2. Server broadcasts WebSocket message to all connected clients
3. All clients receive update and refresh UI
4. **Result:** Real-time sync across multiple devices viewing the interface

---

## Color Management

### Color Formats

**Hex → RGB Conversion:**
```javascript
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return {
    red: parseInt(result[1], 16),    // 0-255
    green: parseInt(result[2], 16),  // 0-255
    blue: parseInt(result[3], 16)    // 0-255
  };
}
```

**RGB → Hex:**
```javascript
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16).slice(1);
}
```

**HSL → RGB:**
```javascript
function hslToRgb(h, s, l) {
  // h: 0-360, s: 0-1, l: 0-1
  // Complex conversion algorithm...
  return { red, green, blue };
}
```

### Brightness Control

Brightness is applied by **scaling RGB values**:

```javascript
function applyBrightness(color, brightness) {
  const scale = brightness / 100;  // 0-100 → 0-1
  return {
    red: Math.round(color.red * scale),
    green: Math.round(color.green * scale),
    blue: Math.round(color.blue * scale)
  };
}
```

**Example:**
- Original: `#FF0000` (255, 0, 0)
- Brightness 50%: `#7F0000` (127, 0, 0)

---

## Profile Storage Format

### File Location
`backend/data/profiles.json`

### Structure

```json
[
  {
    "id": "1705267890123",
    "name": "Purple Dream",
    "description": "Saved at 14/01/2026, 20:30:15",
    "devices": [
      {
        "id": 0,
        "name": "ASUS ROG STRIX Z790",
        "color": { "red": 138, "green": 43, "blue": 226 },
        "mode": 0,
        "brightness": 100
      },
      {
        "id": 1,
        "name": "Corsair Dominator 64GB",
        "color": { "red": 138, "green": 43, "blue": 226 },
        "mode": 0,
        "brightness": 80
      }
    ],
    "createdAt": "2026-01-14T23:30:15.123Z",
    "updatedAt": "2026-01-14T23:30:15.123Z"
  }
]
```

### Profile Operations

**Create:**
1. Snapshot current device states
2. Generate unique ID (timestamp)
3. Store user-provided name/description
4. Append to profiles array
5. Write to file

**Apply:**
1. Read profile from file by ID
2. Iterate through saved device configs
3. Apply color, mode, brightness to each device
4. Return success/failure for each device

---

## OpenRGB SDK Integration

### Protocol Overview

OpenRGB uses a **binary packet-based protocol** over TCP.

### Packet Structure

```
┌─────────────┬──────────┬───────────┬─────────────┬──────────┐
│   Magic     │ Device   │ Packet    │   Packet    │   Data   │
│  "ORGB"     │  Index   │    ID     │   Size      │ Payload  │
│  (4 bytes)  │ (4 bytes)│ (4 bytes) │  (4 bytes)  │ (var)    │
└─────────────┴──────────┴───────────┴─────────────┴──────────┘
```

### Library Usage

```javascript
const { Client } = require('openrgb-sdk');

// Connect
const client = new Client('AppName', 6742, 'localhost');
await client.connect();

// Get device count
const count = await client.getControllerCount();

// Get device data
const device = await client.getControllerData(0);

// Update color
await client.updateMode(0, 0);  // Set to direct mode
await client.updateLeds(0, colors);  // Array of {red, green, blue}

// Disconnect
await client.disconnect();
```

### Error Handling

```javascript
try {
  await client.connect();
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    // OpenRGB not running or SDK server not started
  } else if (error.code === 'ETIMEDOUT') {
    // Connection timeout
  }
}
```

---

## Security Considerations

### Network Exposure

**Default Configuration:**
- Backend: `localhost:3001` (local only)
- Frontend: `localhost:5173` (local only)

**For Network Access:**

To allow access from other devices on your network:

```javascript
// backend/server.js
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server accessible at http://<your-ip>:${PORT}`);
});
```

**⚠️ Security Implications:**
- Anyone on your network can control your RGB
- No authentication by default
- Consider VPN or firewall rules for production

### Recommended Security Measures

1. **Firewall:** Only allow connections from trusted IPs
2. **VPN:** Use Tailscale/ZeroTier for secure remote access
3. **Reverse Proxy:** Use nginx with basic auth
4. **Rate Limiting:** Prevent abuse (not implemented yet)

### Future Enhancements

- [ ] User authentication (username/password)
- [ ] API keys for programmatic access
- [ ] HTTPS/WSS support
- [ ] Role-based access control
- [ ] Activity logging

---

## Performance Optimization

### Caching Strategy

**Problem:** Fetching device data from OpenRGB for every request is slow.

**Solution:** In-memory cache with TTL

```javascript
class Cache {
  constructor(ttl = 5000) {  // 5 second TTL
    this.cache = null;
    this.timestamp = 0;
    this.ttl = ttl;
  }
  
  get() {
    if (Date.now() - this.timestamp < this.ttl) {
      return this.cache;
    }
    return null;
  }
  
  set(data) {
    this.cache = data;
    this.timestamp = Date.now();
  }
}
```

### WebSocket Benefits

- **Polling** (old way): Client requests status every 1s → 60 requests/minute
- **WebSocket**: Server pushes updates only when changes occur → ~1-5 messages/minute

**Bandwidth Savings:** ~95% reduction

---

## Troubleshooting Guide

### Debug Mode

Enable verbose logging:

```javascript
// backend/server.js
const DEBUG = true;

if (DEBUG) {
  console.log('[DEBUG] Device update:', deviceId, color);
}
```

### Common Issues

**1. "ECONNREFUSED" Error**
- OpenRGB not running
- SDK server not started
- Wrong port (should be 6742)

**2. Colors Don't Update**
- Device locked by another software (use RGB Cleanup)
- Wrong mode (switch to Direct mode first)
- OpenRGB lost connection to hardware

**3. WebSocket Disconnects**
- Network instability
- Backend crashed (check console)
- Firewall blocking WebSocket connections

---

## Development Roadmap

### Planned Features

**v1.1:**
- [ ] Audio-reactive effects (Web Audio API)
- [ ] Advanced color picker (gradients, HSL)
- [ ] Per-zone LED control
- [ ] Effect speed control

**v1.2:**
- [ ] Scheduler (cron-based)
- [ ] Game detection hooks
- [ ] REST API rate limiting
- [ ] User authentication

**v2.0:**
- [ ] Electron desktop app
- [ ] Multi-PC support (centralized control)
- [ ] Plugin system
- [ ] Cloud profile sync

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-14  
**Author:** Nightwolf RGB Team
