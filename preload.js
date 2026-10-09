const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('cyberAPI', {
  // PTY Session Management (Real ConPTY Backend)
  pty: {
    createSession: (options) => ipcRenderer.invoke('pty:create', options),
    write: (sessionId, data) => ipcRenderer.send('pty:write', { sessionId, data }),
    resize: (sessionId, cols, rows) => ipcRenderer.send('pty:resize', { sessionId, cols, rows }),
    killSession: (sessionId) => ipcRenderer.invoke('pty:kill', sessionId),
    getAvailableShells: () => ipcRenderer.invoke('pty:get-available-shells'),
    onData: (callback) => {
      const handler = (event, sessionId, data) => callback(sessionId, data);
      ipcRenderer.on('pty:data', handler);
      return () => ipcRenderer.removeListener('pty:data', handler);
    },
    onExit: (callback) => {
      const handler = (event, sessionId, exitCode, signal) => callback(sessionId, exitCode, signal);
      ipcRenderer.on('pty:exit', handler);
      return () => ipcRenderer.removeListener('pty:exit', handler);
    }
  },

  // WSL Intelligence & Subsystem Controls
  wsl: {
    getStatus: () => ipcRenderer.invoke('wsl:get-status'),
    getDistros: () => ipcRenderer.invoke('wsl:get-distros')
  },

  // Process Radar (Real Process Intelligence)
  radar: {
    getProcesses: () => ipcRenderer.invoke('process:get-radar'),
    killPid: (pid) => ipcRenderer.invoke('process:kill-pid', pid)
  },

  // Project Intelligence & Detection
  project: {
    detect: (dirPath) => ipcRenderer.invoke('project:detect', dirPath)
  },

  // Git Intelligence
  git: {
    getStatus: (dirPath) => ipcRenderer.invoke('git:get-status', dirPath)
  },

  // Smart File Navigator
  fs: {
    listDir: (dirPath) => ipcRenderer.invoke('fs:list-dir', dirPath)
  },

  // Cyber AI Integration (Offline + Optional LLM)
  ai: {
    query: (options) => ipcRenderer.invoke('ai:query', options)
  },

  // Window Controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    toggleAlwaysOnTop: () => ipcRenderer.sendSync('window:toggle-always-on-top'),
    setOpacity: (val) => ipcRenderer.send('window:set-opacity', val),
    onWindowState: (callback) => {
      const handler = (event, state) => callback(state);
      ipcRenderer.on('window:state-changed', handler);
      return () => ipcRenderer.removeListener('window:state-changed', handler);
    }
  },

  // Telemetry & Hardware Info
  system: {
    getInitialState: () => ipcRenderer.invoke('terminal:get-initial-state'),
    getTelemetry: () => ipcRenderer.invoke('system:get-telemetry'),
    copyText: (text) => clipboard.writeText(text),
    readText: () => clipboard.readText()
  }
});
