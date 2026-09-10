# ⚙️ How Nightwolf RGB Works

Nightwolf RGB is a high-performance lighting control system built on a three-layer architecture designed for speed, reliability, and precision.

## 🏗️ System Architecture

Nightwolf operates as a bridge between the user and their hardware through a modular stack:

1.  **Client Layer (UI)**: A React-based single-page application that provides real-time visualization and controls.
2.  **Server Layer (Logic)**: A Node.js Express server that manages profiles, handles persistent storage, and maintains a binary connection to the hardware driver.
3.  **Hardware Layer (Driver)**: Integrates with the **OpenRGB SDK** to communicate directly with Motherboards, RAM, GPUs, and peripherals.

---

## 🔌 Communication Protocol

### WebSocket (Real-Time)
Nightwolf uses WebSockets for instantaneous updates. When you move a slider in the dashboard:
- The UI sends a compact JSON packet.
- The server translates this into an OpenRGB SDK command.
- The hardware responds, and the server broadcasts the new state back to all connected clients (e.g., your PC and your phone) simultaneously.

### REST API (Integration)
For third-party apps or custom scripts, Nightwolf exposes a full REST API:
- `GET /api/devices`: List all discovered RGB components.
- `POST /api/devices/:id/color`: Change color instantly.
- `POST /api/cleanup/full`: Trigger the RGB software conflict cleanup.

---

## 🧹 The "RGB Cleanup" Engine
Manual RGB control often fails because manufacturer software (iCUE, Armoury Crate) "locks" the hardware. Nightwolf's Cleanup engine:
1.  Scans for a signature database of over 70 conflicting background services.
2.  Safely terminates these processes.
3.  Restores "Direct Mode" control to the hardware for lag-free performance.

---

## 🛠️ Security & Privacy
- **Zero Telemetry**: No data ever leaves your local network.
- **File-Based Storage**: Your profile configurations are stored locally in `backend/data/`.
- **Open Source**: Every line of code is auditable to ensure no hidden tracking or bloat.
