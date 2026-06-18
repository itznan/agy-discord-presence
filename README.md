# Antigravity CLI Discord Rich Presence 🚀

A lightweight, dependency-free Node.js integration to display your active **Google Antigravity CLI** coding status as Discord Rich Presence. Shows when you are thinking, running terminal commands, editing files, or idling in real-time.

```text
       Playing Antigravity CLI
       Thinking: Analyzing task and planning...
       Project: MyAwesomeProject
       01:23 elapsed
```

---

## ✨ Features
- **Zero Dependencies**: Connects directly to Discord's Named Pipes (Windows) or Unix Sockets (macOS/Linux) using Node's native `net` module. Extremely lightweight.
- **Cross-Platform**: Automatically resolves paths for Windows named pipes and Unix domain sockets.
- **Real-Time Hook Execution**: Intercepts TUI lifecycle events (`PreToolUse`, `PostToolUse`, `PreInvocation`, etc.) to update status instantly.
- **Automatic Lifecycle Control**: Starts up and terminates automatically alongside the CLI as an Antigravity Sidecar process.

---

## 🛠️ Installation & Setup

To install this globally for all your Antigravity workspaces:

### Option A: Automated Installation (Windows)
Open PowerShell in the project directory and run the install script:
```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```
This script will automatically:
1. Copy the sidecar files to your global `~/.gemini/config/sidecars/discord_presence/` directory.
2. Update your global `~/.gemini/config/hooks.json` configuration, merging the new event hooks dynamically with your current user home path.

### Option B: Manual Installation (Cross-Platform)

#### 1. Place the files in your global configurations
Copy this repository's folder contents to your global Antigravity config directory under the `sidecars` namespace:

- **Path**: `~/.gemini/config/sidecars/discord_presence/`
  *(e.g. `C:\Users\<YourUsername>\.gemini\config\sidecars\discord_presence\` on Windows)*

Make sure the directory structure looks like this:
```text
~/.gemini/config/sidecars/discord_presence/
├── sidecar.json
├── src/
│   ├── discord-presence.js
│   └── hook-trigger.js
```

#### 2. Configure the Global Event Hooks
Copy the hook definitions from `hooks.json` in this repository to your global `hooks.json` file located at `~/.gemini/config/hooks.json`.

*(If the file does not exist, create it. If it does exist, append the `"discord-presence"` entry to the root object).*

---

## 🎨 Customizing Discord Branding (Client ID & Icons)

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

## 🔧 Disabling the Integration
To temporarily turn off the Discord updates, you can rename or remove the `~/.gemini/config/hooks.json` file, or type `/hooks` inside the Antigravity TUI to view and manage active hooks.

## 📄 License
This project is open-source and licensed under the MIT License.
