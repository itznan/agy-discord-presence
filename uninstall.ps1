# Antigravity Discord Rich Presence Uninstaller
# This script uninstalls the Discord Rich Presence sidecar and cleans up the event hooks.

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Uninstalling Antigravity Discord Rich Presence..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Define Paths
$GeminiConfigDir = Join-Path $env:USERPROFILE ".gemini\config"
$DestDir = Join-Path $GeminiConfigDir "sidecars\discord_presence"
$GlobalHooksPath = Join-Path $GeminiConfigDir "hooks.json"
$LockFilePath = Join-Path $env:USERPROFILE ".gemini\antigravity-cli\scratch\discord_presence.lock"
$StateFilePath = Join-Path $env:USERPROFILE ".gemini\antigravity-cli\scratch\discord_state.json"

Write-Host "Target Configuration Directory: $DestDir" -ForegroundColor Gray

# 1.5. Terminate the active daemon process if running
if (Test-Path $LockFilePath) {
    Write-Host "Found active daemon lock file. Terminating running daemon process..." -ForegroundColor Gray
    try {
        $DaemonPid = Get-Content -Raw -Path $LockFilePath
        $DaemonPid = $DaemonPid.Trim()
        if ($DaemonPid) {
            Write-Host "Stopping process ID: $DaemonPid..." -ForegroundColor Gray
            Stop-Process -Id $DaemonPid -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "Could not stop process by PID: $_" -ForegroundColor Yellow
    }
    Remove-Item -Path $LockFilePath -Force -ErrorAction SilentlyContinue
}

# Fallback: Kill any node.exe instances running discord-presence.js
try {
    $processes = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    if ($null -eq $processes) {
        $processes = Get-WmiObject Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue
    }
    foreach ($p in $processes) {
        if ($p.CommandLine -like "*discord-presence.js*") {
            Write-Host "Found running discord-presence.js daemon (PID: $($p.ProcessId)). Stopping..." -ForegroundColor Gray
            Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    # Ignore errors here to keep the uninstaller robust
}

if (Test-Path $StateFilePath) {
    Remove-Item -Path $StateFilePath -Force -ErrorAction SilentlyContinue
}


# 2. Remove sidecar files/directory
if (Test-Path $DestDir) {
    Write-Host "Removing sidecar files and directory..." -ForegroundColor Gray
    Remove-Item -Path $DestDir -Recurse -Force
    Write-Host "Successfully removed sidecar files." -ForegroundColor Green
} else {
    Write-Host "Sidecar directory not found, skipping file removal." -ForegroundColor Gray
}

# 3. Update or Clean Global hooks.json
if (Test-Path $GlobalHooksPath) {
    Write-Host "Checking global hooks.json..." -ForegroundColor Gray
    try {
        $GlobalHooksContent = Get-Content -Raw -Path $GlobalHooksPath
        $GlobalHooksObj = ConvertFrom-Json $GlobalHooksContent
        if ($null -ne $GlobalHooksObj) {
            # Check if discord-presence property exists
            $hasProperty = $false
            if ($GlobalHooksObj -is [System.Collections.IDictionary]) {
                $hasProperty = $GlobalHooksObj.ContainsKey("discord-presence")
            } else {
                $hasProperty = [bool]($GlobalHooksObj.PSObject.Properties["discord-presence"])
            }

            if ($hasProperty) {
                Write-Host "Removing discord-presence hook configuration..." -ForegroundColor Gray
                if ($GlobalHooksObj -is [System.Collections.IDictionary]) {
                    $GlobalHooksObj.Remove("discord-presence")
                    $remainingCount = $GlobalHooksObj.Count
                } else {
                    $GlobalHooksObj.PSObject.Properties.Remove("discord-presence")
                    $remainingCount = 0
                    foreach ($prop in $GlobalHooksObj.PSObject.Properties) {
                        $remainingCount++
                    }
                }

                if ($remainingCount -eq 0) {
                    Write-Host "No other hooks remaining. Removing empty hooks.json..." -ForegroundColor Gray
                    Remove-Item -Path $GlobalHooksPath -Force
                } else {
                    $JsonSettings = $GlobalHooksObj | ConvertTo-Json -Depth 100
                    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
                    [System.IO.File]::WriteAllText($GlobalHooksPath, $JsonSettings, $Utf8NoBom)
                    Write-Host "Removed 'discord-presence' key from hooks.json." -ForegroundColor Green
                }
            } else {
                Write-Host "No 'discord-presence' configuration found in global hooks.json." -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "Warning: Could not process global hooks.json: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "Global hooks.json not found, skipping configuration cleanup." -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Uninstall complete! ✨" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
