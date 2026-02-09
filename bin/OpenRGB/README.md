# OpenRGB Binaries

This directory should contain the OpenRGB executable files.

## Download OpenRGB

Download the latest OpenRGB release from:
https://openrgb.org/releases.html

## Required Files

Place the following files in this directory:
- `OpenRGB.exe` (Windows executable)
- All `.dll` files from the OpenRGB package

## Why not in Git?

The OpenRGB binaries are large files (20-50MB) and are frequently updated. 
Instead of storing them in the repository, download them directly from the official source.

## Auto-Start Configuration

The Nightwolf RGB backend can automatically start OpenRGB for you.
Set `AUTO_START_OPENRGB=true` in your `backend/.env` file.
