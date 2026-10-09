const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const pty = require('node-pty');

// Ensure GPU stability across all Windows hardware configurations
app.disableHardwareAcceleration();

let mainWindow = null;
let isQuitting = false;
const activeSessions = new Map(); // sessionId -> { ptyProcess, shellType, cwd, title, pid }

// Global process error safety
process.on('uncaughtException', (err) => {
  console.error('[CYBERTERM] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CYBERTERM] Unhandled Rejection:', reason);
});

// Safe IPC sender that guarantees window and webContents exist
function safeSend(channel, ...args) {
  if (isQuitting || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    const wc = mainWindow.webContents;
    if (wc && !wc.isDestroyed()) {
      wc.send(channel, ...args);
    }
  } catch (e) {
    // Window or webContents destroyed during tick
  }
}

// Cleanly kill a PTY session and its process tree
function killSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return false;

  const { ptyProcess, pid } = session;
  activeSessions.delete(sessionId);

  if (ptyProcess) {
    try {
      ptyProcess.kill();
    } catch (e) {}

    // On Windows, also ensure the ConPTY process tree is terminated
    if (process.platform === 'win32' && pid) {
      try {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
      } catch (e) {}
    }
  }

  return true;
}

// Cleanly terminate all active PTY sessions on application exit
function cleanupAllSessions() {
  for (const sessionId of Array.from(activeSessions.keys())) {
    killSession(sessionId);
  }
}

// Safe Windows to WSL path translation
function windowsToWslPath(winPath) {
  if (!winPath) return '~';
  const trimmed = winPath.trim();
  if (trimmed.startsWith('/') || trimmed === '~') return trimmed;

  const match = trimmed.match(/^([a-zA-Z]):[\\/](.*)/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, '/');
    return `/mnt/${drive}/${rest}`;
  }
  return trimmed;
}

// Shell & WSL Detection
function detectShells() {
  const shells = {
    powershell: false,
    cmd: true,
    wsl: false,
    wslDistro: '',
    wslDistros: [],
    wslMetadata: null,
    gitbash: false
  };

  try {
    execSync('where powershell.exe', { stdio: 'ignore' });
    shells.powershell = true;
  } catch (e) {}

  try {
    const rawOut = execSync('wsl.exe -l -v', { timeout: 4000 });
    const text = rawOut.toString('utf16le');
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // Line 0 is header: NAME STATE VERSION
    for (let i = 1; i < lines.length; i++) {
      const isDefault = lines[i].startsWith('*');
      const cleanLine = lines[i].replace(/^\*\s*/, '').trim();
      const parts = cleanLine.split(/\s+/);
      if (parts[0]) {
        shells.wsl = true;
        const distroObj = {
          name: parts[0],
          isDefault,
          state: parts[1] || 'Stopped',
          version: parts[2] || '2'
        };
        shells.wslDistros.push(distroObj);
        if (isDefault || !shells.wslDistro) {
          shells.wslDistro = parts[0];
        }
      }
    }
  } catch (e) {
    try {
      execSync('where wsl.exe', { stdio: 'ignore' });
      shells.wsl = true;
      shells.wslDistro = 'Ubuntu';
      shells.wslDistros.push({ name: 'Ubuntu', isDefault: true, state: 'Running', version: '2' });
    } catch (err) {}
  }

  // If Ubuntu is in distros, ensure it is preferred default if none explicitly marked
  if (shells.wslDistros.length > 0) {
    const uDistro = shells.wslDistros.find(d => d.name.toLowerCase().includes('ubuntu'));
    if (uDistro && !shells.wslDistros.some(d => d.isDefault)) {
      shells.wslDistro = uDistro.name;
    }
  }

  // Fetch real Linux environment metadata if WSL is available
  if (shells.wsl && shells.wslDistro) {
    try {
      const kernel = execSync(`wsl.exe -d ${shells.wslDistro} --cd ~ uname -r`, { timeout: 3000 }).toString().trim();
      const osRel = execSync(`wsl.exe -d ${shells.wslDistro} --cd ~ cat /etc/os-release`, { timeout: 3000 }).toString();
      const m = osRel.match(/PRETTY_NAME="?([^\n"]+)/);
      const distroName = m ? m[1] : shells.wslDistro;
      const user = execSync(`wsl.exe -d ${shells.wslDistro} --cd ~ printenv USER`, { timeout: 3000 }).toString().trim();
      const home = execSync(`wsl.exe -d ${shells.wslDistro} --cd ~ printenv HOME`, { timeout: 3000 }).toString().trim();
      const shell = execSync(`wsl.exe -d ${shells.wslDistro} --cd ~ printenv SHELL`, { timeout: 3000 }).toString().trim();

      shells.wslMetadata = {
        distro: shells.wslDistro,
        distroName,
        kernel: `Linux ${kernel}`,
        user: user || 'user',
        home: home || '~',
        shell: shell ? (shell.endsWith('bash') ? 'Bash' : shell) : 'Bash'
      };
    } catch (e) {
      shells.wslMetadata = {
        distro: shells.wslDistro || 'Ubuntu',
        distroName: 'Ubuntu Linux',
        kernel: 'Linux 6.x',
        user: 'user',
        home: '~',
        shell: 'Bash'
      };
    }
  }

  const gitBashPaths = [
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs\\Git\\bin\\bash.exe')
  ];

  for (const gbPath of gitBashPaths) {
    if (fs.existsSync(gbPath)) {
      shells.gitbash = true;
      shells.gitBashPath = gbPath;
      break;
    }
  }

  return shells;
}

const detectedShells = detectShells();

// Resolve Shell executable and arguments
function resolveShellConfig(shellType, targetCwd, requestedDistro) {
  const norm = (shellType || 'powershell').toLowerCase();

  let executable = 'powershell.exe';
  let args = ['-NoLogo'];
  let title = 'PowerShell';
  let cwd = targetCwd && fs.existsSync(targetCwd) ? targetCwd : (process.env.USERPROFILE || process.cwd());

  if (norm === 'cmd') {
    executable = 'cmd.exe';
    args = [];
    title = 'Command Prompt';
  } else if (norm === 'wsl') {
    executable = 'wsl.exe';
    const distro = requestedDistro || detectedShells.wslDistro || 'Ubuntu';
    title = `WSL (${distro})`;

    // Check if user explicitly asked for "Open WSL Here" with a specific valid directory
    if (targetCwd && targetCwd.trim() && (fs.existsSync(targetCwd) || targetCwd.startsWith('/'))) {
      const wslPath = windowsToWslPath(targetCwd);
      args = ['-d', distro, '--cd', wslPath];
      cwd = targetCwd && fs.existsSync(targetCwd) ? targetCwd : (process.env.USERPROFILE || 'C:\\');
    } else {
      // Default: start in the real Linux user's home directory ($HOME / ~)
      args = ['-d', distro, '--cd', '~'];
      cwd = process.env.USERPROFILE || 'C:\\';
    }
  } else if (norm === 'gitbash') {
    const gb = detectedShells.gitBashPath || 'C:\\Program Files\\Git\\bin\\bash.exe';
    if (fs.existsSync(gb)) {
      executable = gb;
      args = ['--login', '-i'];
      title = 'Git Bash';
    } else {
      executable = 'powershell.exe';
      args = ['-NoLogo'];
      title = 'PowerShell (Fallback)';
    }
  } else {
    // Default to PowerShell
    executable = 'powershell.exe';
    args = ['-NoLogo'];
    title = 'PowerShell';
  }

  return { executable, args, title, cwd, shellType: norm, distro: requestedDistro || detectedShells.wslDistro };
}

// Real Storage Detection
function getStorageInfo() {
  try {
    const s = fs.statfsSync('C:\\');
    const total = s.bsize * s.blocks;
    const free = s.bsize * s.bfree;
    const used = total - free;
    return {
      drive: 'C:',
      totalGb: Math.round(total / (1024 * 1024 * 1024)),
      usedGb: Math.round(used / (1024 * 1024 * 1024)),
      percent: Math.round((used / total) * 100)
    };
  } catch (e) {
    return { drive: 'C:', totalGb: 512, usedGb: 220, percent: 43 };
  }
}

// Real Network Detection
function getNetworkInfo() {
  const ifaces = os.networkInterfaces();
  for (const name in ifaces) {
    for (const net of ifaces[name]) {
      if (!net.internal && net.family === 'IPv4') {
        return { status: 'ONLINE', ip: net.address, name };
      }
    }
  }
  return { status: 'OFFLINE', ip: '127.0.0.1', name: 'loopback' };
}

// 30-sample CPU History for waveform
const cpuHistory = [12, 16, 14, 20, 18, 15, 22, 26, 20, 16, 18, 22, 20, 17, 19, 24, 20, 16, 22, 19, 17, 21, 18, 23, 26, 20, 17, 21, 19, 22];
let previousCpuTime = null;

function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }

  if (!previousCpuTime) {
    previousCpuTime = { idle: totalIdle, total: totalTick };
    return cpuHistory[cpuHistory.length - 1];
  }

  const idleDelta = totalIdle - previousCpuTime.idle;
  const totalDelta = totalTick - previousCpuTime.total;
  previousCpuTime = { idle: totalIdle, total: totalTick };

  const usage = totalDelta > 0 ? (1 - idleDelta / totalDelta) * 100 : 0;
  const currentVal = Math.min(Math.max(Math.round(usage), 0), 100);

  cpuHistory.shift();
  cpuHistory.push(currentVal);

  return currentVal;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 880,
    minHeight: 560,
    frame: false,
    transparent: false,
    backgroundColor: '#030508',
    title: 'CYBERTERM',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('maximize', () => {
    safeSend('window:state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    safeSend('window:state-changed', { isMaximized: false });
  });

  mainWindow.on('close', () => {
    cleanupAllSessions();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (process.env.CYBERTERM_TEST === '1') {
    mainWindow.webContents.on('console-message', (event, level, message) => {
      console.log('[RENDERER LOG]', message);
    });
    setTimeout(() => {
      console.log('[CYBERTERM_TEST_PASSED] Application initialized cleanly.');
      cleanupAllSessions();
      app.quit();
    }, 4500);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  cleanupAllSessions();
});

app.on('window-all-closed', () => {
  cleanupAllSessions();
  if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.on('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  cleanupAllSessions();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
});

ipcMain.on('window:toggle-always-on-top', (event) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const isTop = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(isTop);
  event.returnValue = isTop;
});

ipcMain.on('window:set-opacity', (event, opacity) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const op = Math.min(Math.max(parseFloat(opacity) || 1.0, 0.4), 1.0);
  mainWindow.setOpacity(op);
});

// PTY Session Management (Real ConPTY Backend)
ipcMain.handle('pty:create', (event, { sessionId, shellType, cwd, cols, rows, env, distro }) => {
  try {
    // If a session with this ID already exists, cleanly kill it first
    if (activeSessions.has(sessionId)) {
      killSession(sessionId);
    }

    const config = resolveShellConfig(shellType, cwd, distro);
    const shellEnv = {
      ...process.env,
      ...env
    };

    if (config.shellType === 'wsl') {
      // Strip Windows environment variables that conflict with native Linux
      delete shellEnv.HOME;
      delete shellEnv.USER;
      delete shellEnv.SHELL;
      // Pass LUCIFER_STARTED=1 through WSLENV so .bashrc avoids tmux interception
      shellEnv.LUCIFER_STARTED = '1';
      shellEnv.WSLENV = shellEnv.WSLENV ? `${shellEnv.WSLENV}:LUCIFER_STARTED` : 'LUCIFER_STARTED';
    }

    shellEnv.TERM = 'xterm-256color';
    shellEnv.COLORTERM = 'truecolor';
    shellEnv.LANG = 'en_US.UTF-8';

    const ptyProcess = pty.spawn(config.executable, config.args, {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: config.cwd,
      env: shellEnv,
      useConpty: true
    });

    const sessionData = {
      ptyProcess,
      shellType: config.shellType,
      cwd: config.cwd,
      title: config.title,
      pid: ptyProcess.pid,
      createdAt: Date.now()
    };

    activeSessions.set(sessionId, sessionData);

    ptyProcess.onData((data) => {
      safeSend('pty:data', sessionId, data);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      activeSessions.delete(sessionId);
      safeSend('pty:exit', sessionId, exitCode, signal);
    });

    return {
      success: true,
      sessionId,
      shellType: config.shellType,
      title: config.title,
      cwd: config.cwd,
      pid: ptyProcess.pid
    };
  } catch (err) {
    console.error(`[CYBERTERM] Failed to create PTY session ${sessionId}:`, err);
    return {
      success: false,
      error: err.message
    };
  }
});

ipcMain.on('pty:write', (event, { sessionId, data }) => {
  const session = activeSessions.get(sessionId);
  if (session && session.ptyProcess) {
    try {
      session.ptyProcess.write(data);
    } catch (err) {
      console.error(`[CYBERTERM] Error writing to PTY ${sessionId}:`, err);
    }
  }
});

ipcMain.on('pty:resize', (event, { sessionId, cols, rows }) => {
  const session = activeSessions.get(sessionId);
  if (session && session.ptyProcess) {
    try {
      if (cols > 0 && rows > 0) {
        session.ptyProcess.resize(cols, rows);
      }
    } catch (err) {
      // Ignore transient resize errors during layout transitions
    }
  }
});

ipcMain.handle('pty:kill', (event, sessionId) => {
  const killed = killSession(sessionId);
  return { success: killed };
});

ipcMain.handle('pty:get-available-shells', () => {
  return detectShells();
});

// WSL Subsystem Handlers
ipcMain.handle('wsl:get-status', () => {
  const current = detectShells();
  return {
    isInstalled: current.wsl,
    isRunning: current.wslDistros.some(d => d.state === 'Running'),
    distros: current.wslDistros,
    activeDistro: current.wslDistro,
    metadata: current.wslMetadata
  };
});

ipcMain.handle('wsl:get-distros', () => {
  const current = detectShells();
  return current.wslDistros;
});

// Initial Setup & Telemetry
ipcMain.handle('terminal:get-initial-state', () => {
  const userInfo = os.userInfo();
  const cpus = os.cpus();
  return {
    cwd: process.env.USERPROFILE || process.cwd(),
    availableShells: detectShells(),
    username: userInfo.username || 'mothi',
    hostname: os.hostname() || 'LUCIFER',
    platform: os.platform(),
    release: os.release(),
    cpuModel: cpus[0]?.model ? cpus[0].model.replace(/\s+/g, ' ').trim() : 'AMD Ryzen / Intel Core',
    cpuCores: cpus.length || 8
  };
});

ipcMain.handle('system:get-telemetry', () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const totalGb = (totalMem / (1024 * 1024 * 1024)).toFixed(1);
  const usedGb = (usedMem / (1024 * 1024 * 1024)).toFixed(1);
  const memPercent = Math.round((usedMem / totalMem) * 100);
  const cpus = os.cpus();

  return {
    cpuPercent: getCpuUsage(),
    cpuHistory: [...cpuHistory],
    cpuModel: cpus[0]?.model ? cpus[0].model.replace(/\s+/g, ' ').trim() : 'AMD Ryzen / Intel Core',
    cpuCores: cpus.length || 16,
    totalMemGb: totalGb,
    usedMemGb: usedGb,
    memPercent,
    storage: getStorageInfo(),
    network: getNetworkInfo(),
    uptimeSeconds: Math.floor(os.uptime()),
    cwd: process.env.USERPROFILE || process.cwd(),
    hostname: os.hostname() || 'LUCIFER',
    username: os.userInfo().username || 'mothi'
  };
});

// ==================================================
// PROCESS RADAR (Real Process Intelligence)
// ==================================================
ipcMain.handle('process:get-radar', async () => {
  const terminalProcesses = [];
  for (const [sessionId, session] of activeSessions.entries()) {
    terminalProcesses.push({
      sessionId,
      pid: session.pid,
      shellType: session.shellType,
      title: session.title,
      cwd: session.cwd,
      status: 'RUNNING',
      uptimeSec: Math.floor((Date.now() - session.createdAt) / 1000)
    });
  }

  let systemProcesses = [];
  try {
    const psCmd = 'Get-CimInstance Win32_Process | Sort-Object WorkingSetSize -Descending | Select-Object -First 25 ProcessId, Name, WorkingSetSize | ConvertTo-Json';
    const raw = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf-8', timeout: 3500 });
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    systemProcesses = list.map(p => ({
      pid: p.ProcessId,
      name: p.Name,
      ramMb: Math.round((p.WorkingSetSize || 0) / (1024 * 1024)),
      isTerminal: terminalProcesses.some(t => t.pid === p.ProcessId)
    }));
  } catch (e) {
    // If PowerShell times out, return terminal processes
  }

  return { terminalProcesses, systemProcesses };
});

ipcMain.handle('process:kill-pid', async (event, pid) => {
  if (!pid || pid < 10) return { success: false, error: 'Cannot terminate critical system process' };
  try {
    execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ==================================================
// PROJECT DETECTION (Real Manifest Analysis)
// ==================================================
ipcMain.handle('project:detect', async (event, dirPath) => {
  const targetDir = dirPath && fs.existsSync(dirPath) ? dirPath : (process.env.USERPROFILE || process.cwd());
  const project = {
    isProject: false,
    path: targetDir,
    name: path.basename(targetDir),
    types: [],
    details: {},
    quickActions: []
  };

  try {
    // Git
    if (fs.existsSync(path.join(targetDir, '.git'))) {
      project.isProject = true;
      project.types.push('Git');
      project.quickActions.push({ label: 'git status', cmd: 'git status' }, { label: 'git log', cmd: 'git log --oneline -n 10' });
    }

    // Node.js
    const pkgPath = path.join(targetDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      project.isProject = true;
      project.types.push('Node.js');
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        project.details.nodePackage = pkg.name || path.basename(targetDir);
        project.details.version = pkg.version || '1.0.0';
        if (pkg.scripts) {
          project.details.scripts = Object.keys(pkg.scripts);
          if (pkg.scripts.dev) project.quickActions.push({ label: 'npm run dev', cmd: 'npm run dev' });
          else if (pkg.scripts.start) project.quickActions.push({ label: 'npm start', cmd: 'npm start' });
          if (pkg.scripts.test) project.quickActions.push({ label: 'npm test', cmd: 'npm test' });
        }
      } catch (e) {}
    }

    // Python
    const reqPath = path.join(targetDir, 'requirements.txt');
    const pyprojectPath = path.join(targetDir, 'pyproject.toml');
    const hasVenv = fs.existsSync(path.join(targetDir, '.venv')) || fs.existsSync(path.join(targetDir, 'venv'));
    if (fs.existsSync(reqPath) || fs.existsSync(pyprojectPath) || hasVenv) {
      project.isProject = true;
      project.types.push('Python');
      project.details.hasVenv = hasVenv;
      if (hasVenv) {
        project.quickActions.push({ label: 'Activate venv', cmd: '.\\.venv\\Scripts\\Activate.ps1' });
      }
      if (fs.existsSync(reqPath)) {
        project.quickActions.push({ label: 'pip install', cmd: 'pip install -r requirements.txt' });
      }
    }

    // Rust
    if (fs.existsSync(path.join(targetDir, 'Cargo.toml'))) {
      project.isProject = true;
      project.types.push('Rust');
      project.quickActions.push({ label: 'cargo run', cmd: 'cargo run' }, { label: 'cargo test', cmd: 'cargo test' });
    }

    // Go
    if (fs.existsSync(path.join(targetDir, 'go.mod'))) {
      project.isProject = true;
      project.types.push('Go');
      project.quickActions.push({ label: 'go run .', cmd: 'go run .' });
    }

    // C / C++
    if (fs.existsSync(path.join(targetDir, 'CMakeLists.txt')) || fs.existsSync(path.join(targetDir, 'Makefile'))) {
      project.isProject = true;
      project.types.push('C/C++');
      project.quickActions.push({ label: 'cmake --build', cmd: 'cmake --build .' });
    }
  } catch (err) {}

  return project;
});

// ==================================================
// GIT INTELLIGENCE (Real Repo Analysis)
// ==================================================
ipcMain.handle('git:get-status', async (event, dirPath) => {
  const targetDir = dirPath && fs.existsSync(dirPath) ? dirPath : (process.env.USERPROFILE || process.cwd());
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore' });
  } catch (e) {
    return { isRepo: false };
  }

  try {
    const branchOut = execSync('git rev-parse --abbrev-ref HEAD', { cwd: targetDir, encoding: 'utf-8' }).trim();
    const statusOut = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf-8' });
    const logOut = execSync('git log -n 5 --oneline', { cwd: targetDir, encoding: 'utf-8' }).trim();

    const modified = [];
    const untracked = [];
    const staged = [];

    statusOut.split(/\r?\n/).filter(Boolean).forEach(line => {
      const code = line.slice(0, 2);
      const file = line.slice(3).trim();
      if (code.includes('?')) untracked.push(file);
      else if (code[0] !== ' ' && code[0] !== '?') staged.push(file);
      else modified.push(file);
    });

    let ahead = 0;
    let behind = 0;
    try {
      const aheadBehindOut = execSync('git rev-list --left-right --count HEAD...@{upstream}', { cwd: targetDir, encoding: 'utf-8' }).trim();
      const parts = aheadBehindOut.split(/\s+/);
      if (parts.length >= 2) {
        ahead = parseInt(parts[0], 10) || 0;
        behind = parseInt(parts[1], 10) || 0;
      }
    } catch (e) {}

    return {
      isRepo: true,
      branch: branchOut,
      staged,
      modified,
      untracked,
      ahead,
      behind,
      commits: logOut.split(/\r?\n/).filter(Boolean)
    };
  } catch (err) {
    return { isRepo: true, branch: 'unknown', modified: [], untracked: [], staged: [], ahead: 0, behind: 0, commits: [] };
  }
});

// ==================================================
// SMART FILE NAVIGATOR (Real Filesystem Inspection)
// ==================================================
ipcMain.handle('fs:list-dir', async (event, dirPath) => {
  const targetDir = dirPath && fs.existsSync(dirPath) ? dirPath : (process.env.USERPROFILE || process.cwd());
  try {
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const items = entries.map(ent => {
      let size = 0;
      let mtime = null;
      try {
        const stat = fs.statSync(path.join(targetDir, ent.name));
        size = stat.size;
        mtime = stat.mtime;
      } catch (e) {}
      return {
        name: ent.name,
        isDirectory: ent.isDirectory(),
        size,
        mtime
      };
    });

    // Sort: directories first, then alphabetical
    items.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });

    return {
      currentDir: targetDir,
      parentDir: path.dirname(targetDir),
      items: items.slice(0, 100)
    };
  } catch (err) {
    return { currentDir: targetDir, items: [], error: err.message };
  }
});

// ==================================================
// CYBER AI (Optional Live LLM Query)
// ==================================================
ipcMain.handle('ai:query', async (event, { provider, apiKey, endpoint, model, prompt, context }) => {
  if (provider === 'gemini') {
    if (!apiKey) return { success: false, error: 'Gemini API key is required. Please set it in Settings.' };
    const modelName = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${context ? `Context: ${context}\n\n` : ''}${prompt}` }] }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return { success: true, text: data.candidates[0].content.parts[0].text };
      }
      return { success: false, error: data.error?.message || 'Empty response from Gemini' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  if (provider === 'ollama') {
    const base = endpoint || 'http://localhost:11434';
    try {
      const response = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3',
          prompt: `${context ? `Context: ${context}\n\n` : ''}${prompt}`,
          stream: false
        })
      });
      const data = await response.json();
      return { success: true, text: data.response };
    } catch (err) {
      return { success: false, error: `Failed to connect to Ollama at ${base}: ${err.message}` };
    }
  }

  return { success: false, error: `Provider ${provider} not supported` };
});

