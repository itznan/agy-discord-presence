const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_CLIENT_ID = '1232546525498970152';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || DEFAULT_CLIENT_ID;
const STATE_FILE = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'scratch', 'discord_state.json');
const LOCK_FILE = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'scratch', 'discord_presence.lock');

// Manage process single-instance lock
function acquireLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const oldPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
      if (oldPid) {
        try {
          process.kill(oldPid, 0); // Check if process is alive
          console.log(`Discord Presence daemon already running with PID ${oldPid}. Exiting.`);
          process.exit(0);
        } catch (err) {
          // Process not alive, stale lock
        }
      }
    }
    fs.writeFileSync(LOCK_FILE, process.pid.toString(), 'utf8');
    
    // Clean up lock file on exit
    const cleanup = () => {
      try {
        if (fs.existsSync(LOCK_FILE)) {
          const currentPid = parseInt(fs.readFileSync(LOCK_FILE, 'utf8'), 10);
          if (currentPid === process.pid) {
            fs.unlinkSync(LOCK_FILE);
          }
        }
      } catch (e) {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => process.exit(0));
    process.on('SIGTERM', () => process.exit(0));
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to acquire lock:', err.message);
  }
}

class DiscordIPC {
  constructor(clientId) {
    this.clientId = clientId;
    this.socket = null;
    this.connected = false;
  }

  getPipePath(index) {
    if (process.platform === 'win32') {
      return `\\\\.\\pipe\\discord-ipc-${index}`;
    }
    const envs = ['XDG_RUNTIME_DIR', 'TMPDIR', 'TMP', 'TEMP'];
    for (const name of envs) {
      if (process.env[name]) {
        return path.join(process.env[name], `discord-ipc-${index}`);
      }
    }
    return `/tmp/discord-ipc-${index}`;
  }

  async connect() {
    return new Promise((resolve) => {
      let index = 0;
      const attemptConnect = () => {
        if (index > 9) {
          resolve(false);
          return;
        }
        const pipePath = this.getPipePath(index);
        const socket = net.createConnection(pipePath);

        socket.on('connect', () => {
          this.socket = socket;
          this._handshake()
            .then(() => {
              this.connected = true;
              this._setupListeners();
              resolve(true);
            })
            .catch(() => {
              socket.destroy();
              index++;
              attemptConnect();
            });
        });

        socket.on('error', () => {
          index++;
          attemptConnect();
        });
      };

      attemptConnect();
    });
  }

  _handshake() {
    return new Promise((resolve, reject) => {
      this._send(0, { v: 1, client_id: this.clientId });

      const onData = (data) => {
        this.socket.off('data', onData);
        try {
          const { op, payload } = this._parse(data);
          if (op === 1 && payload.evt !== 'ERROR') {
            resolve();
          } else {
            reject(new Error('Handshake failed'));
          }
        } catch (err) {
          reject(err);
        }
      };

      this.socket.on('data', onData);
    });
  }

  _setupListeners() {
    this.socket.on('close', () => {
      this.connected = false;
      this.socket = null;
      console.log('Discord connection closed.');
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err.message);
    });
  }

  _send(op, payload) {
    if (!this.socket) return;
    const payloadStr = JSON.stringify(payload);
    const payloadBuf = Buffer.from(payloadStr, 'utf8');
    const headerBuf = Buffer.alloc(8);
    headerBuf.writeUInt32LE(op, 0);
    headerBuf.writeUInt32LE(payloadBuf.length, 4);
    this.socket.write(Buffer.concat([headerBuf, payloadBuf]));
  }

  _parse(data) {
    if (data.length < 8) throw new Error('Data too short');
    const op = data.readUInt32LE(0);
    const length = data.readUInt32LE(4);
    const payloadStr = data.slice(8, 8 + length).toString('utf8');
    return { op, payload: JSON.parse(payloadStr) };
  }

  setActivity(activity) {
    if (!this.connected) return;
    const nonce = Math.random().toString(36).substring(2);
    this._send(1, {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: process.pid,
        activity
      },
      nonce
    });
  }

  close() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const content = fs.readFileSync(STATE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    // Ignore errors
  }
  return null;
}

async function run() {
  acquireLock();
  const ipc = new DiscordIPC(CLIENT_ID);
  const startTime = Math.floor(Date.now() / 1000);
  let lastState = null;
  let connected = false;

  console.log('Discord Rich Presence Sidecar Started.');

  while (true) {
    if (!connected) {
      console.log('Connecting to Discord...');
      connected = await ipc.connect();
      if (connected) {
        console.log('Connected to Discord!');
        lastState = null; // force update
      } else {
        console.log('Discord client not detected. Retrying in 10s...');
        await new Promise(r => setTimeout(r, 10000));
        continue;
      }
    }

    const state = loadState();

    if (state) {
      if (state.status === 'Offline') {
        console.log('Offline status received. Exiting daemon.');
        ipc.close();
        process.exit(0);
      }
      if (state.cliPid) {
        try {
          process.kill(state.cliPid, 0);
        } catch (err) {
          if (err.code === 'ESRCH') {
            console.log(`CLI process ${state.cliPid} is no longer running. Exiting daemon.`);
            ipc.close();
            process.exit(0);
          }
        }
      }
    }

    const currentState = state || {
      status: 'Idle',
      details: 'Awaiting commands',
      project: 'Workspace'
    };

    if (JSON.stringify(currentState) !== JSON.stringify(lastState)) {
      const activity = {
        state: `Project: ${currentState.project || 'Workspace'}`,
        details: `${currentState.status || 'Active'}: ${currentState.details || 'Working'}`,
        timestamps: {
          start: startTime
        },
        assets: {
          large_image: currentState.iconUrl || 'antigravity',
          large_text: currentState.largeText || 'Antigravity CLI',
          small_image: currentState.status === 'Idle' ? 'idle' : 'active',
          small_text: currentState.status || 'Active'
        }
      };

      try {
        ipc.setActivity(activity);
        lastState = currentState;
      } catch (err) {
        console.error('Failed to update activity:', err.message);
        connected = false;
        ipc.close();
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }

    await new Promise(r => setTimeout(r, 2000));
  }
}

run();
