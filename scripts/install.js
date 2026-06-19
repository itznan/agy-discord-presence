#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('==================================================');
console.log('Installing Antigravity Discord Rich Presence...');
console.log('==================================================');

const geminiConfigDir = path.join(os.homedir(), '.gemini', 'config');
const destDir = path.join(geminiConfigDir, 'sidecars', 'discord_presence');
const globalHooksPath = path.join(geminiConfigDir, 'hooks.json');

console.log(`Target Configuration Directory: ${destDir}`);

try {
  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    console.log('Creating sidecar directory...');
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy sidecar.json and dist directory
  console.log('Copying sidecar files...');
  fs.copyFileSync(path.join(__dirname, '..', 'sidecar.json'), path.join(destDir, 'sidecar.json'));

  const distDestDir = path.join(destDir, 'dist');
  if (!fs.existsSync(distDestDir)) {
    fs.mkdirSync(distDestDir, { recursive: true });
  }
  fs.copyFileSync(path.join(__dirname, '..', 'dist', 'discord-presence.js'), path.join(distDestDir, 'discord-presence.js'));
  fs.copyFileSync(path.join(__dirname, '..', 'dist', 'hook-trigger.js'), path.join(distDestDir, 'hook-trigger.js'));

  // Prepare Hook Configuration
  const localHooksPath = path.join(__dirname, '..', 'hooks.json');
  if (!fs.existsSync(localHooksPath)) {
    throw new Error('Local hooks.json file not found in script directory!');
  }

  const hookTriggerPath = path.join(destDir, 'dist', 'hook-trigger.js');
  const templateHooksObj = JSON.parse(fs.readFileSync(localHooksPath, 'utf8'));

  // Update commands in hooks dynamically and cross-platform
  const events = ['PreToolUse', 'PostToolUse', 'PreInvocation', 'PostInvocation', 'Stop'];
  for (const eventName of events) {
    if (templateHooksObj['discord-presence'] && templateHooksObj['discord-presence'][eventName]) {
      const matchers = templateHooksObj['discord-presence'][eventName];
      for (const matcher of matchers) {
        if (matcher.hooks) {
          for (const hook of matcher.hooks) {
            if (hook.type === 'command') {
              hook.command = `node "${hookTriggerPath}" ${eventName}`;
            }
          }
        }
      }
    }
  }

  // Update or Create Global hooks.json
  let globalHooksObj = {};
  if (fs.existsSync(globalHooksPath)) {
    console.log('Updating existing global hooks.json...');
    try {
      const content = fs.readFileSync(globalHooksPath, 'utf8');
      globalHooksObj = JSON.parse(content) || {};
    } catch (err) {
      console.warn('Global hooks.json is not valid JSON. Backing it up and creating a new one...');
      fs.copyFileSync(globalHooksPath, globalHooksPath + '.bak');
    }
  } else {
    console.log('Creating new global hooks.json...');
  }

  // Merge the discord-presence configuration
  globalHooksObj['discord-presence'] = templateHooksObj['discord-presence'];

  // Save updated global hooks.json
  fs.writeFileSync(globalHooksPath, JSON.stringify(globalHooksObj, null, 2), 'utf8');

  console.log('\n✨ Installation complete! ✨');
  console.log('The Discord Rich Presence sidecar will automatically launch and update your status next time you run Antigravity CLI.');
  console.log('To test/verify hooks are active, type \'/hooks\' in your Antigravity TUI.');
  console.log('==================================================');
} catch (error) {
  console.error('\n[ERROR] Installation failed:', error.message);
  process.exit(1);
}
