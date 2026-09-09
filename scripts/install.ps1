#!/usr/bin/env pwsh
# Nightwolf RGB — install from GitHub Releases (not a packaged .exe).
#   irm https://github.com/klebertiko/NightwolfRGB/releases/latest/download/install.ps1 | iex
param(
    [String]$Version = "latest"
)

$ErrorActionPreference = "Stop"
$Repo = "klebertiko/NightwolfRGB"
$Asset = "nightwolf-windows-x64.zip"
$Root = if ($env:NIGHTWOLF_INSTALL) { $env:NIGHTWOLF_INSTALL } else { Join-Path $env:LOCALAPPDATA "NightwolfRGB" }
$Bin = Join-Path $Root "bin"

if (-not ("Win32.NativeMethods" -as [Type])) {
    Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @"
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
    IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
    uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
"@
}

function Publish-Env {
    $HWND_BROADCAST = [IntPtr] 0xffff
    $result = [UIntPtr]::Zero
    [Win32.NativeMethods]::SendMessageTimeout($HWND_BROADCAST, 0x1a, [UIntPtr]::Zero, "Environment", 2, 5000, [ref] $result) | Out-Null
}

function Write-UserPath([String]$Dir) {
    $key = Get-Item -Path 'HKCU:'
    $envKey = $key.OpenSubKey('Environment', $true)
    $current = $envKey.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
    $parts = @($current -split ';' | Where-Object { $_ -ne '' })
    if ($parts -contains $Dir) { return }
    $envKey.SetValue('Path', (($parts + $Dir) -join ';'))
    Publish-Env
    $env:PATH = "$Dir;$env:PATH"
}

$Base = "https://github.com/$Repo/releases"
$Url = if ($Version -eq "latest") {
    "$Base/latest/download/$Asset"
} else {
    "$Base/download/$Version/$Asset"
}

New-Item -ItemType Directory -Force -Path $Root | Out-Null
$ZipPath = Join-Path $env:TEMP $Asset
Write-Host "Downloading $Url"
curl.exe -#SfLo $ZipPath $Url
if ($LASTEXITCODE -ne 0) { throw "Download failed: $Url" }

if (Test-Path (Join-Path $Root "package.json")) {
    Get-ChildItem -Force $Root | Where-Object { $_.Name -ne 'bin' } | Remove-Item -Recurse -Force
}

Expand-Archive -LiteralPath $ZipPath -DestinationPath $Root -Force
Remove-Item $ZipPath -Force

$OpenRgb = Join-Path $Root "bin\OpenRGB\OpenRGB.exe"
if (-not (Test-Path $OpenRgb)) { throw "Release is missing OpenRGB.exe — refusing to finish install" }

New-Item -ItemType Directory -Force -Path $Bin | Out-Null
$Shim = Join-Path $Bin "nightwolfrgb.cmd"
@(
    '@echo off'
    "set NIGHTWOLF_ROOT=$Root"
    "node `"$Root\scripts\nightwolfrgb.cjs`" %*"
) | Set-Content -Encoding ascii $Shim

Write-UserPath $Bin

Push-Location $Root
try {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        npm run install:all
        if ($LASTEXITCODE -ne 0) { throw "npm run install:all failed" }
    } else {
        Write-Warning "npm not on PATH. Install Node.js, then run npm run install:all inside $Root"
    }
} finally {
    Pop-Location
}

Write-Host "Nightwolf RGB installed to $Root"
Write-Host "Restart the terminal, then: nightwolfrgb update"
