# Nightwolf RGB - Admin Launcher
# This script requests administrator privileges and launches the dev servers

Write-Host "🐺 Nightwolf RGB - Starting with Admin Privileges..." -ForegroundColor Cyan

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  Not running as administrator. Requesting elevation..." -ForegroundColor Yellow
    
    # Restart the script with admin privileges
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "✅ Running with administrator privileges" -ForegroundColor Green
Write-Host ""

# Navigate to the project root
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Start the dev servers
Write-Host "🚀 Starting Backend + Frontend..." -ForegroundColor Cyan
npm run dev

# Keep the window open if there's an error
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Error occurred. Press any key to exit..." -ForegroundColor Red
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
