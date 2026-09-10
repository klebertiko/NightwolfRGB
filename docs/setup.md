# 🚀 Nightwolf RGB - Quick Start

## Prerequisites

- **Node.js** 18+ installed
- **Windows** (Linux/Mac support coming soon)

## Setup (One-Time)

### 1. Download OpenRGB

Download OpenRGB executable and place in `bin/OpenRGB/`:

**Option A: Manual Download (Recommended)**
1. Go to: https://gitlab.com/CalcProgrammer1/OpenRGB/-/releases
2. Download: `OpenRGB_Windows_64bit.zip`
3. Extract `OpenRGB.exe`
4. Place in: `bin/OpenRGB/OpenRGB.exe`

**Option B: Direct Link**
```powershell
# Download latest release
curl -L "https://gitlab.com/CalcProgrammer1/OpenRGB/-/releases/permalink/latest/downloads/OpenRGB_Windows_64bit.zip" -o OpenRGB.zip

# Extract to bin/OpenRGB/
Expand-Archive OpenRGB.zip -DestinationPath bin/OpenRGB/
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Running Nightwolf RGB

### Auto Mode (Recommended)

**Backend automatically starts OpenRGB!**

```bash
# Terminal 1 - Backend
cd backend
npm run app

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Then open: **http://localhost:5173**

### What Happens?

1. ✅ Backend checks if OpenRGB is running
2. ✅ If not → Starts `OpenRGB.exe` automatically  
3. ✅ If yes → Uses existing instance
4. ✅ Connects to SDK Server (port 6742)
5. ✅ Ready to control RGB!

### Manual Mode (Advanced)

If you prefer to run OpenRGB manually:

1. Set in `backend/.env`:
   ```env
   AUTO_START_OPENRGB=false
   ```

2. Start OpenRGB manually:
   - Open OpenRGB
   - SDK Server tab → Start Server

3. Run backend:
   ```bash
   cd backend
   npm run app
   ```

## Verification

**Check if OpenRGB is Working:**

```bash
cd bin/OpenRGB
./OpenRGB.exe --help
```

You should see OpenRGB help output.

**Check Backend Connection:**

After running `npm run app`, you should see:

```
🐺 Nightwolf RGB Backend Starting...

🔧 Auto-start mode enabled
🔍 Checking OpenRGB SDK Server...
⚠️  SDK Server not detected, auto-starting OpenRGB...
🔵 Starting OpenRGB...
   Waiting for SDK Server to be ready...
✅ OpenRGB SDK Server is ready!
✅ Connected to OpenRGB SDK Server

┌─────────────────────────────────────────┐
│   🐺 Nightwolf RGB - Ready!            │
└─────────────────────────────────────────┘
🚀 Server:    http://localhost:3001
📡 WebSocket: ws://localhost:3001
🔗 OpenRGB:   ✅ Connected
🤖 OpenRGB:   Auto-started (PID: XXXX)

👉 Open: http://localhost:5173
```

## Troubleshooting

### "OpenRGB executable not found"

**Solution:** Download OpenRGB.exe and place in `bin/OpenRGB/`

See: `bin/OpenRGB/README.md`

### "Failed to start OpenRGB"

**Common causes:**
1. Missing `OpenRGB.exe` in `bin/OpenRGB/`
2. Port 6742 already in use
3. Antivirus blocking execution

**Solutions:**
- Verify file exists: `ls bin/OpenRGB/OpenRGB.exe`
- Check port: `netstat -ano | findstr :6742`
- Add exception in antivirus

### "SDK Server failed to start within timeout"

**Solution:** OpenRGB may be slow to start. 

Try:
1. Run OpenRGB manually first to verify it works
2. Increase timeout (edit `launcher/openrgb-launcher.ts`)
3. Check OpenRGB logs for errors

### Backend crashes on startup

**Solution:** Check TypeScript compilation

```bash
cd backend
npm run build
```

Fix any TypeScript errors shown.

## Hardware Compatibility

### Supported RGB (via OpenRGB)

- ✅ **ARGB** (Addressable RGB - 5V / 3-pin)
- ✅ **RGB** (Non-addressable - 12V / 4-pin)
- ✅ Corsair RAM (iCUE compatible)
- ✅ ASUS Aura motherboards
- ✅ Most RGB fans
- ✅ LED strips

### Check Your Hardware

1. Run OpenRGB manually
2. Check if devices are detected
3. If yes → Nightwolf RGB will work!
4. If no → Check OpenRGB documentation

## Features

Once running, you can:

- 🎨 Control RGB colors (10 presets + custom)
- 🔆 Adjust brightness
- 🔄 Sync all devices
- 💾 Save/load profiles
- 🧹 RGB Cleanup (kill conflicting software)
- ⚡ Real-time updates via WebSocket

## Next Steps

- See: [README.md](README.md) for full documentation
- See: [technical.md](./technical.md) for technical details
- See: [implementation_plan.md](.gemini/antigravity/brain/.../implementation_plan.md) for development roadmap

## Need Help?

- Check logs in terminal for errors
- Verify OpenRGB works standalone first
- Ensure RGB hardware is connected
- Check firewall/antivirus settings

---

**Enjoy controlling your RGB!** 🌈🐺
