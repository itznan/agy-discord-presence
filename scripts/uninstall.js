#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

console.log('==================================================');
console.log('Uninstalling Antigravity Discord Rich Presence...');
console.log('==================================================');

const geminiConfigDir = path.join(os.homedir(), '.gemini', 'config');
const destDir = path.join(geminiConfigDir, 'sidecars', 'discord_presence');
const globalHooksPath = path.join(geminiConfigDir, 'hooks.json');
const lockFilePath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'scratch', 'discord_presence.lock');
const stateFilePath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'scratch', 'discord_state.json');

console.log(`Target Configuration Directory: ${destDir}`);

try {
  // 1. Terminate running daemon process
  if (fs.existsSync(lockFilePath)) {
    console.log('Found active daemon lock file. Terminating running daemon process...');
    try {
      const pidStr = fs.readFileSync(lockFilePath, 'utf8').trim();
      const pid = parseInt(pidStr, 10);
      if (pid) {
        console.log(`Stopping process ID: ${pid}...`);
        process.kill(pid, 'SIGTERM');
      }
    } catch (err) {
      console.warn(`Could not stop process by PID: ${err.message}`);
    }
    try {
      fs.unlinkSync(lockFilePath);
    } catch (e) {}
  }

  // Fallback: Kill any node process running discord-presence.js
  try {
    if (process.platform === 'win32') {
      const output = execSync('wmic process where "name=\'node.exe\'" get processid,commandline', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('discord-presence.js')) {
          const match = line.match(/(\d+)\s*$/);
          if (match) {
            const pid = parseInt(match[1], 10);
            process.kill(pid, 'SIGTERM');
            console.log(`Stopped process ID (fallback): ${pid}`);
          }
        }
      }
    } else {
      const output = execSync('ps -ef | grep discord-presence.js | grep -v grep', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const lines = output.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 1) {
          const pid = parseInt(parts[1], 10);
          process.kill(pid, 'SIGTERM');
          console.log(`Stopped process ID (fallback): ${pid}`);
        }
      }
    }
  } catch (err) {
    // Ignore fallback errors
  }

  if (fs.existsSync(stateFilePath)) {
    try {
      fs.unlinkSync(stateFilePath);
    } catch (e) {}
  }

  // 2. Remove sidecar files/directory
  if (fs.existsSync(destDir)) {
    console.log('Removing sidecar files and directory...');
    fs.rmSync(destDir, { recursive: true, force: true });
    console.log('Successfully removed sidecar files.');
  } else {
    console.log('Sidecar directory not found, skipping file removal.');
  }

  // 3. Update or Clean Global hooks.json
  if (fs.existsSync(globalHooksPath)) {
    console.log('Checking global hooks.json...');
    try {
      const content = fs.readFileSync(globalHooksPath, 'utf8');
      const globalHooksObj = JSON.parse(content) || {};
      if (globalHooksObj['discord-presence']) {
        console.log('Removing discord-presence hook configuration...');
        delete globalHooksObj['discord-presence'];

        if (Object.keys(globalHooksObj).length === 0) {
          console.log('No other hooks remaining. Removing empty hooks.json...');
          fs.unlinkSync(globalHooksPath);
        } else {
          fs.writeFileSync(globalHooksPath, JSON.stringify(globalHooksObj, null, 2), 'utf8');
          console.log("Removed 'discord-presence' key from hooks.json.");
        }
      } else {
        console.log('No \'discord-presence\' configuration found in global hooks.json.');
      }
    } catch (err) {
      console.warn(`Warning: Could not process global hooks.json: ${err.message}`);
    }
  } else {
    console.log('Global hooks.json not found, skipping configuration cleanup.');
  }

  console.log('\n✨ Uninstall complete! ✨');
  console.log('==================================================');
} catch (error) {
  console.error('\n[ERROR] Uninstallation failed:', error.message);
  process.exit(1);
}
