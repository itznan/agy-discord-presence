# Antigravity Discord Rich Presence Installer
# This script installs the Discord Rich Presence sidecar and configures the event hooks.

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Installing Antigravity Discord Rich Presence..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Define Paths
$SourceDir = $PSScriptRoot
$GeminiConfigDir = Join-Path $env:USERPROFILE ".gemini\config"
$DestDir = Join-Path $GeminiConfigDir "sidecars\discord_presence"
$GlobalHooksPath = Join-Path $GeminiConfigDir "hooks.json"

Write-Host "Target Configuration Directory: $DestDir" -ForegroundColor Gray

# 2. Create Destination Directory
if (-not (Test-Path $DestDir)) {
    Write-Host "Creating sidecar directory..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
}

# 3. Copy files to destination
Write-Host "Copying sidecar files..." -ForegroundColor Gray
Copy-Item -Path (Join-Path $SourceDir "sidecar.json") -Destination $DestDir -Force
Copy-Item -Path (Join-Path $SourceDir "dist") -Destination $DestDir -Recurse -Force

# 4. Prepare Hook Configuration
$LocalHooksPath = Join-Path $SourceDir "hooks.json"
if (-not (Test-Path $LocalHooksPath)) {
    Write-Error "Local hooks.json file not found in script directory!"
}

# Read local hooks configuration
$HooksContent = Get-Content -Raw -Path $LocalHooksPath

# Replace hardcoded user home path in hooks.json with active user's home path
$HooksContent = $HooksContent.Replace("C:\\Users\\lotio", $env:USERPROFILE.Replace("\", "\\"))
$HooksContent = $HooksContent.Replace("C:/Users/lotio", $env:USERPROFILE.Replace("\", "/"))

$TemplateHooksObj = ConvertFrom-Json $HooksContent

# 5. Update or Create Global hooks.json
if (Test-Path $GlobalHooksPath) {
    Write-Host "Updating existing global hooks.json..." -ForegroundColor Gray
    try {
        $GlobalHooksContent = Get-Content -Raw -Path $GlobalHooksPath
        $GlobalHooksObj = ConvertFrom-Json $GlobalHooksContent
        if ($null -eq $GlobalHooksObj) {
            $GlobalHooksObj = [PSCustomObject]@{}
        }
    } catch {
        Write-Host "Global hooks.json is not valid JSON. Backing it up and creating a new one..." -ForegroundColor Yellow
        $BackupPath = "$GlobalHooksPath.bak"
        Copy-Item -Path $GlobalHooksPath -Destination $BackupPath -Force
        $GlobalHooksObj = [PSCustomObject]@{}
    }
    
    # Merge the discord-presence configuration
    $GlobalHooksObj | Add-Member -NotePropertyName "discord-presence" -NotePropertyValue $TemplateHooksObj."discord-presence" -Force
} else {
    Write-Host "Creating new global hooks.json..." -ForegroundColor Gray
    $GlobalHooksObj = $TemplateHooksObj
}

# Save updated global hooks.json (UTF-8 without BOM)
$JsonSettings = $GlobalHooksObj | ConvertTo-Json -Depth 100
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($GlobalHooksPath, $JsonSettings, $Utf8NoBom)

Write-Host ""
Write-Host "✨ Installation complete! ✨" -ForegroundColor Green
Write-Host "The Discord Rich Presence sidecar will automatically launch and update your status next time you run Antigravity CLI." -ForegroundColor White
Write-Host ""
Write-Host "To test/verify hooks are active, type '/hooks' in your Antigravity TUI." -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan
