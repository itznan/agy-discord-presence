# Antigravity CLI Discord Rich Presence 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)](#)
[![Dependencies](https://img.shields.io/badge/dependencies-zero-success.svg)](#)

A lightweight, dependency-free Node.js integration to display your active **Google Antigravity CLI** coding status as Discord Rich Presence. It updates your status in real-time, showing when you are thinking, running terminal commands, editing files, or idling.

```text
       Playing Antigravity CLI
       Thinking: Analyzing task and planning...
       Project: MyAwesomeProject
       01:23 elapsed
```

---

## ✨ Features
- **Zero Dependencies**: Connects directly to Discord's Local Named Pipes (Windows) or Unix Sockets (macOS/Linux) using Node's native `net` module. Extremely lightweight.
- **Cross-Platform**: Automatically resolves paths for Windows named pipes and Unix domain sockets.
- **Dynamic File Icon Resolution**: Displays file-specific icons dynamically using [Material Icon Theme](https://github.com/PKief/vscode-material-icon-theme) matching the file you are currently viewing or editing.
- **Real-Time Hook Execution**: Intercepts TUI lifecycle events (`PreToolUse`, `PostToolUse`, `PreInvocation`, etc.) to update status instantly.
- **Automatic Lifecycle Control**: Starts up and terminates automatically alongside the CLI as an Antigravity Sidecar process.

---

## 🛠️ Installation & Setup

To install this globally for all your Antigravity workspaces:

### Option A: Automated Installation (Cross-Platform) - **Recommended**
Simply run `npm install` inside the project folder:
```bash
npm install
```
This will automatically trigger the postinstall script, which:
1. Copies the minified sidecar files and configurations to your global `~/.gemini/config/sidecars/discord_presence/` directory.
2. Updates your global `~/.gemini/config/hooks.json` configuration, merging the new event hooks dynamically with your current user home path.

### Option B: Manual Installation (Cross-Platform)
If you prefer not to use `npm install`, you can manually:
1. Copy `sidecar.json` and the `dist/` directory to your global Antigravity config directory under the `sidecars` namespace:
   - **Path**: `~/.gemini/config/sidecars/discord_presence/`
     *(e.g., `C:\Users\<YourUsername>\.gemini\config\sidecars\discord_presence\` on Windows or `~/.gemini/config/sidecars/discord_presence/` on macOS/Linux)*
2. Copy the hook definitions from `hooks.json` in this repository into your global `hooks.json` file located at `~/.gemini/config/hooks.json` (under the `"discord-presence"` key).

---

## 🔍 How It Works (Architecture)

The integration consists of two main components:
1. **The Hook Trigger (`hook-trigger.js`)**: Runs quickly on every lifecycle event of the Antigravity TUI. It serializes the event details, active files, and tool invocation arguments to `discord_state.json`, then triggers the daemon if it's not already running.
2. **The Sidecar Daemon (`discord-presence.js`)**: A persistent background process that maintains the IPC connection with Discord, throttles status updates, checks if the main TUI process is still alive, and shuts itself down cleanly when the TUI exits.

```mermaid
graph TD
    A[Antigravity CLI Event] -->|PreToolUse / PreInvocation| B[hook-trigger.js]
    B -->|Writes state| C[(discord_state.json)]
    B -->|Ensures running| D[discord-presence.js]
    D -->|Reads state| C
    D -->|IPC Pipe/Socket| E[Discord Client]
```

---

## 🎨 Dynamic File Icons

When editing or viewing files, the Discord status dynamically updates its large icon based on the file type. We map a wide range of extensions and special filenames to Material Icon Theme graphics:

| Category | Supported Languages / Types |
| :--- | :--- |
| **Web / JS** | JS, MJS, JSX, TS, TSX, Vue, Svelte, HTML, CSS, SCSS, Sass, Less |
| **Languages** | Python (`.py`, `.ipynb`), C, C++, C#, Java, Kotlin, Scala, Go, Rust, Swift, Dart, PHP, Ruby, Perl |
| **Scripts** | Shell (`.sh`, `.bash`), PowerShell (`.ps1`), Batch (`.bat`, `.cmd`) |
| **Data & Config**| JSON, YAML, XML, TOML, INI, SQL, DB |
| **Special Files** | `Dockerfile`, `package.json`, `tsconfig.json`, `webpack.config.js`, `vite.config.js`, `next.config.js`, `.gitignore`, `hooks.json`, `sidecar.json`, `README.md` |

---

## ⚙️ Customizing Discord Branding (Client ID & Icons)

By default, the integration uses a generic Application ID displaying "Antigravity CLI". To show your own customized branding, name, or icons:

1. Head to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it (e.g., `Antigravity CLI`, or `Gemini Coding`). The name of the application will display on Discord as: `Playing <Application Name>`.
3. Select **Rich Presence** -> **Visual Assets** in the sidebar. Upload the following images:
   - A large image named `antigravity` (your logo)
   - A small active status indicator named `active`
   - A small idle status indicator named `idle`
4. Copy the **Application ID** (Client ID) from the **General Information** page.
5. Provide this ID either by:
   - Setting the `DISCORD_CLIENT_ID` environment variable:
     ```bash
     export DISCORD_CLIENT_ID="your_client_id_here"
     ```
   - Or replacing `DEFAULT_CLIENT_ID` directly inside `src/discord-presence.js`.

---

## 🔧 Uninstallation & Disabling

### Option A: Automated Uninstallation (Cross-Platform) - **Recommended**
Simply run `npm run uninstall` inside the project folder:
```bash
npm run uninstall
```
This script will automatically:
1. Stop any running active Discord Presence background processes.
2. Delete the sidecar files from your global `~/.gemini/config/sidecars/discord_presence/` directory.
3. Clean up your global `~/.gemini/config/hooks.json` file by removing the `"discord-presence"` hooks.

### Option B: Manual Uninstallation (Cross-Platform)
If you prefer not to use `npm run uninstall`, you can manually:
1. Delete the sidecar directory:
   - **Path**: `~/.gemini/config/sidecars/discord_presence/`
2. Remove the `"discord-presence"` block from your global `~/.gemini/config/hooks.json` file.

### Temporarily Disabling
To temporarily turn off the Discord updates without uninstalling:
- Type `/hooks` inside the Antigravity TUI to view, enable, or disable active hooks dynamically.
- Or temporarily rename or remove the `~/.gemini/config/hooks.json` file.

## 🛠️ Development & Bundling

If you make modifications to the source code under the `src/` directory, you need to rebuild the minified files under the `dist/` directory before installing.

To build/minify the files:
```bash
npm run build
```
This uses `esbuild` to compile all source JS files and bundle them into compact, single-file scripts in `dist/`.

## 📄 License
This project is open-source and licensed under the [MIT License](https://opensource.org/licenses/MIT).

