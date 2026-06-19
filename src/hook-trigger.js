const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

function ensureDaemonIsRunning() {
  const lockFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'scratch', 'discord_presence.lock');
  let running = false;
  if (fs.existsSync(lockFile)) {
    try {
      const pid = parseInt(fs.readFileSync(lockFile, 'utf8'), 10);
      if (pid) {
        process.kill(pid, 0); // Check if alive
        running = true;
      }
    } catch (e) {
      // Stale lock
    }
  }

  if (!running) {
    const daemonPath = path.join(__dirname, 'discord-presence.js');
    const child = spawn(process.execPath, [daemonPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();
  }
}
function getIconForFile(filename) {
  if (!filename) return null;
  const ext = path.extname(filename).toLowerCase().replace('.', '');

  const extensionMap = {
    // JavaScript / TypeScript / React
    'js': 'javascript',
    'mjs': 'javascript',
    'cjs': 'javascript',
    'jsx': 'react',
    'ts': 'typescript',
    'tsx': 'react',
    'vue': 'vue',
    'svelte': 'svelte',

    // Web
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'sass',
    'sass': 'sass',
    'less': 'less',

    // Python
    'py': 'python',
    'pyw': 'python',
    'ipynb': 'notebook',

    // C / C++ / C#
    'c': 'c',
    'cpp': 'cpp',
    'h': 'h',
    'hpp': 'h',
    'cs': 'csharp',

    // Java / Kotlin / Scala
    'java': 'java',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',

    // Go / Rust / Swift / Dart
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'dart': 'dart',

    // PHP / Ruby / Perl
    'php': 'php',
    'rb': 'ruby',
    'pl': 'perl',

    // Shell / Scripts
    'sh': 'console',
    'bash': 'console',
    'ps1': 'powershell',
    'bat': 'console',
    'cmd': 'console',

    // Data / Config / Markup
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'toml': 'toml',
    'ini': 'settings',
    'sql': 'database',
    'db': 'database',

    // Docs
    'md': 'markdown',
    'markdown': 'markdown',
    'txt': 'document',
    'pdf': 'pdf',

    // Media / Archives
    'png': 'image',
    'jpg': 'image',
    'jpeg': 'image',
    'gif': 'image',
    'svg': 'svg',
    'webp': 'image',
    'zip': 'zip',
    'tar': 'zip',
    'gz': 'zip',
    'rar': 'zip',
    'mp3': 'audio',
    'wav': 'audio',
    'mp4': 'video',
    'mkv': 'video',
  };

  const basename = path.basename(filename).toLowerCase();
  const specialMap = {
    'dockerfile': 'docker',
    'package.json': 'npm',
    'package-lock.json': 'npm',
    'tsconfig.json': 'tsconfig',
    'webpack.config.js': 'webpack',
    'vite.config.js': 'vite',
    'vite.config.ts': 'vite',
    'next.config.js': 'next',
    'next.config.mjs': 'next',
    '.gitignore': 'git',
    'hooks.json': 'settings',
    'sidecar.json': 'settings',
    'readme.md': 'readme',
  };

  if (specialMap[basename]) {
    return specialMap[basename];
  }

  return extensionMap[ext] || null;
}

function main() {
  const event = process.argv[2] || 'unknown';
  const stateFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'scratch', 'discord_state.json');

  let toolInfo = null;
  // Read stdin synchronously if it is redirected (not a TTY terminal)
  if (!process.stdin.isTTY) {
    try {
      const data = fs.readFileSync(0, 'utf-8');
      if (data && data.trim()) {
        toolInfo = JSON.parse(data);
      }
    } catch (err) {
      // Ignore parsing errors
    }
  }

  // Resolve project workspace name
  let projectName = 'Workspace';
  if (toolInfo && toolInfo.workspacePaths && toolInfo.workspacePaths.length > 0) {
    projectName = path.basename(toolInfo.workspacePaths[0]);
  } else {
    projectName = path.basename(process.cwd());
  }

  const toolCall = toolInfo?.toolCall;
  const toolName = toolCall?.name || 'a tool';
  const args = toolCall?.args;

  // Load existing state to optimize PID resolution and preserve icons
  let cachedCliPid = null;
  let cachedIconUrl = null;
  let cachedLargeText = null;
  try {
    if (fs.existsSync(stateFile)) {
      const content = fs.readFileSync(stateFile, 'utf8');
      const oldState = JSON.parse(content);
      if (oldState) {
        if (oldState.cliPid) cachedCliPid = oldState.cliPid;
        if (oldState.iconUrl) cachedIconUrl = oldState.iconUrl;
        if (oldState.largeText) cachedLargeText = oldState.largeText;
      }
    }
  } catch (err) {}

  function getProcessInfo(pid) {
    try {
      if (process.platform === 'win32') {
        const out = execSync(`powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').Name; (Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').ParentProcessId"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const lines = out.trim().split(/\r?\n/);
        if (lines.length >= 2) {
          return {
            name: lines[0].trim(),
            ppid: parseInt(lines[1].trim(), 10)
          };
        }
      } else {
        const out = execSync(`ps -p ${pid} -o ppid=,comm=`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        const parts = out.trim().split(/\s+/);
        if (parts.length >= 2) {
          return {
            ppid: parseInt(parts[0], 10),
            name: parts[1]
          };
        }
      }
    } catch (e) {}
    return null;
  }

  function findCliPid() {
    let pid = process.ppid;
    for (let i = 0; i < 5; i++) {
      if (!pid) break;
      const info = getProcessInfo(pid);
      if (!info) break;
      const name = info.name.toLowerCase();
      if (name.includes('agy') || name.includes('antigravity')) {
        return pid;
      }
      pid = info.ppid;
    }
    return null;
  }

  let cliPid = null;
  if (cachedCliPid) {
    try {
      process.kill(cachedCliPid, 0);
      if (process.ppid === cachedCliPid) {
        cliPid = cachedCliPid;
      } else {
        const parentInfo = getProcessInfo(process.ppid);
        if (parentInfo && parentInfo.ppid === cachedCliPid) {
          cliPid = cachedCliPid;
        }
      }
    } catch (err) {}
  }

  if (!cliPid) {
    cliPid = findCliPid() || process.ppid;
  }

  // Resolve current active file icon
  let activeFile = null;
  if (args) {
    if (args.TargetFile || args.Target) {
      activeFile = args.TargetFile || args.Target;
    } else if (args.AbsolutePath) {
      activeFile = args.AbsolutePath;
    }
  }

  let currentIconUrl = cachedIconUrl || null;
  let currentLargeText = cachedLargeText || 'Antigravity CLI';

  if (activeFile) {
    const iconName = getIconForFile(activeFile);
    if (iconName) {
      currentIconUrl = `https://wsrv.nl/?url=raw.githubusercontent.com/PKief/vscode-material-icon-theme/master/icons/${iconName}.svg&output=png&w=512&h=512`;
      currentLargeText = `Editing ${path.basename(activeFile)}`;
    } else {
      currentIconUrl = null;
      currentLargeText = 'Antigravity CLI';
    }
  }

  const stateData = {
    event,
    timestamp: Date.now() / 1000,
    cwd: process.cwd(),
    project: projectName,
    cliPid: cliPid,
    iconUrl: currentIconUrl,
    largeText: currentLargeText
  };

  if (event === 'PreInvocation') {
    stateData.status = 'Thinking';
    stateData.details = 'Analyzing task and planning...';
  } else if (event === 'PreToolUse') {
    stateData.status = 'Executing';

    const args = toolCall?.args;
    if (args) {
      if (args.CommandLine) {
        let cmd = args.CommandLine;
        if (cmd.length > 60) {
          cmd = cmd.substring(0, 57) + '...';
        }
        stateData.details = `Running: ${cmd}`;
      } else if (args.TargetFile || args.Target) {
        const file = args.TargetFile || args.Target;
        stateData.details = `Editing: ${path.basename(file)}`;
      } else if (args.AbsolutePath) {
        stateData.details = `Viewing: ${path.basename(args.AbsolutePath)}`;
      } else if (args.DirectoryPath) {
        stateData.details = `Listing: ${path.basename(args.DirectoryPath)}`;
      } else if (args.Query) {
        stateData.details = `Searching: "${args.Query}"`;
      } else {
        stateData.details = `Running tool: ${toolName}`;
      }
    } else {
      stateData.details = `Running tool: ${toolName}`;
    }
  } else if (event === 'PostToolUse') {
    stateData.status = 'Idle';
    stateData.details = 'Awaiting your command';
  } else if (event === 'PostInvocation') {
    stateData.status = 'Idle';
    stateData.details = 'Awaiting your command';
  } else if (event === 'Stop') {
    stateData.status = 'Offline';
    stateData.details = 'Session ended';
  }

  try {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    fs.writeFileSync(stateFile, JSON.stringify(stateData, null, 2), 'utf8');
  } catch (err) {
    // Ignore errors
  }

  // Ensure daemon is started in the background
  try {
    ensureDaemonIsRunning();
  } catch (err) {
    // Ignore spawning errors
  }

  // Only return the allow decision for PreToolUse to prevent unmarshalling errors on other hooks
  if (event === 'PreToolUse') {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
}

main();
